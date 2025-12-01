"""Material upload and processing service."""

import zipfile
import tempfile
import shutil
from pathlib import Path
from typing import Dict, List, Any, Tuple
from fastapi import HTTPException, UploadFile

from src.config.settings import settings
from src.file_processor import extract_text_from_pptx
from src.services.ai_service import AIService


class MaterialService:
    """Business logic for course material operations."""
    
    def __init__(self):
        self.ai_service = AIService()
    
    async def process_materials_upload(
        self,
        course_id: str,
        course_plan: Dict[str, Any],
        materials_zip: UploadFile
    ) -> Tuple[List[Dict[str, str]], Dict[str, List[str]], Dict[str, str], Dict[str, str]]:
        """
        Process uploaded course materials ZIP file.
        
        Args:
            course_id: Course identifier
            course_plan: Course plan JSON
            materials_zip: Uploaded ZIP file
            
        Returns:
            Tuple of (saved_materials, topic_mapping, parsed_materials, topic_content_mapping)
        """
        # Verify it's a zip file
        if not materials_zip.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="File must be a ZIP archive")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir_path = Path(temp_dir)
            
            # Extract materials
            materials = self._extract_materials(materials_zip, temp_dir_path)
            
            if not materials:
                raise HTTPException(
                    status_code=400,
                    detail="No PDF or PPTX files found in the zip archive"
                )
            
            # Store parsed content (filename -> content)
            parsed_materials = {
                m['filename']: m['content'] for m in materials
            }
            
            # Map materials to topics using AI (for file-level mapping)
            topic_paths = self._extract_topic_paths(course_plan)
            topic_mapping = self.ai_service.map_materials_to_topics(
                topic_paths=topic_paths,
                materials=materials
            )
            
            # Create topic-to-content mapping using AI
            # This maps each topic to specific relevant content from materials
            topic_content_mapping = self._create_topic_content_mapping(
                topic_paths=topic_paths,
                topic_mapping=topic_mapping,
                parsed_materials=parsed_materials
            )
            
            # Save materials permanently
            saved_materials = self._save_materials(
                course_id,
                materials,
                temp_dir_path / "extracted"
            )
            
            return saved_materials, topic_mapping, parsed_materials, topic_content_mapping
    
    def _extract_materials(
        self,
        materials_zip: UploadFile,
        temp_dir_path: Path
    ) -> List[Dict[str, str]]:
        """Extract materials from ZIP file."""
        zip_path = temp_dir_path / materials_zip.filename
        extract_dir = temp_dir_path / "extracted"
        extract_dir.mkdir()
        
        # Save and extract ZIP
        with open(zip_path, 'wb') as f:
            shutil.copyfileobj(materials_zip.file, f)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        
        # Find and process supported files
        materials = []
        supported_extensions = ['.pdf', '.pptx', '.ppt', '.docx']
        
        for file_path in extract_dir.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                content = self._extract_content(file_path)
                
                materials.append({
                    'filename': file_path.name,
                    'content': content,
                    'relative_path': str(file_path.relative_to(extract_dir))
                })
        
        return materials
    
    def _extract_content(self, file_path: Path) -> str:
        """Extract text content from file."""
        from src.file_processor import process_uploaded_files
        
        # Use existing file processor
        content = ""
        try:
            if file_path.suffix.lower() in ['.pptx', '.ppt']:
                content = extract_text_from_pptx(str(file_path))
            elif file_path.suffix.lower() == '.pdf':
                # Use PyPDF2 extraction
                import PyPDF2
                with open(file_path, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    for page in pdf_reader.pages:
                        content += page.extract_text() + "\n"
            elif file_path.suffix.lower() == '.docx':
                # Use python-docx extraction
                import docx
                doc = docx.Document(str(file_path))
                content = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            print(f"Error extracting content from {file_path}: {e}")
            content = f"Content from {file_path.name}"
        
        return content
    
    def _extract_topic_paths(self, course_plan: Dict[str, Any]) -> List[str]:
        """Extract all topic paths from course outline."""
        def traverse(items: List[Dict], parent_path: str = "") -> List[str]:
            """Recursively extract topic paths."""
            paths = []
            
            if not isinstance(items, list):
                return paths
            
            for item in items:
                if not isinstance(item, dict):
                    continue
                
                label = item.get("label", "")
                
                if label:
                    # Build path
                    current_path = f"{parent_path}/{label}" if parent_path else label
                    paths.append(current_path)
                    
                    # Recursively process children
                    if "children" in item and isinstance(item["children"], list):
                        child_paths = traverse(item["children"], current_path)
                        paths.extend(child_paths)
            
            return paths
        
        topic_paths = []
        if isinstance(course_plan, dict) and "outline" in course_plan:
            outline = course_plan["outline"]
            if isinstance(outline, list):
                topic_paths = traverse(outline)
        
        return topic_paths
    
    def _create_topic_content_mapping(
        self,
        topic_paths: List[str],
        topic_mapping: Dict[str, List[str]],
        parsed_materials: Dict[str, str]
    ) -> Dict[str, str]:
        """
        Create a mapping from each topic to its specific relevant content using AI.
        
        Uses AI to extract ONLY the sections relevant to each topic from the
        full material content, rather than including entire files.
        
        Args:
            topic_paths: List of all topic paths from course outline
            topic_mapping: Mapping of topics to material filenames
            parsed_materials: Mapping of filenames to their extracted text content
            
        Returns:
            Mapping of topic paths to AI-extracted relevant content
        """
        topic_content_mapping = {}
        
        for topic_path in topic_paths:
            # Get just the topic name (last part of path)
            topic_name = topic_path.split("/")[-1] if "/" in topic_path else topic_path
            
            # Get files mapped to this topic
            topic_files = topic_mapping.get(topic_path, [])
            
            if not topic_files:
                # Try matching by topic name alone
                for key, files in topic_mapping.items():
                    if topic_name in key or key.endswith(topic_name):
                        topic_files = files
                        break
            
            if not topic_files:
                # No specific mapping, topic will use outline content as fallback
                topic_content_mapping[topic_path] = ""
                continue
            
            # Combine full content from all mapped files
            full_content_parts = []
            for filename in topic_files:
                if filename in parsed_materials:
                    content = parsed_materials[filename]
                    if content:
                        full_content_parts.append(f"--- From {filename} ---\n{content}")
            
            full_content = "\n\n".join(full_content_parts) if full_content_parts else ""
            
            if not full_content:
                topic_content_mapping[topic_path] = ""
                continue
            
            # Use AI to extract only the relevant sections for this topic
            try:
                extracted_content = self.ai_service.extract_topic_content(
                    topic=topic_name,
                    full_content=full_content
                )
                topic_content_mapping[topic_path] = extracted_content
                print(f"Extracted {len(extracted_content)} chars for topic: {topic_name}")
            except Exception as e:
                print(f"Error extracting content for topic {topic_name}: {e}")
                # Fallback to full content if AI extraction fails
                topic_content_mapping[topic_path] = full_content
        
        return topic_content_mapping
    
    def _save_materials(
        self,
        course_id: str,
        materials: List[Dict[str, str]],
        extract_dir: Path
    ) -> List[Dict[str, str]]:
        """Save materials to permanent storage."""
        course_materials_dir = settings.UPLOAD_DIR / f"course_{course_id}_materials"
        course_materials_dir.mkdir(exist_ok=True)
        
        saved_materials = []
        for material in materials:
            source_path = extract_dir / material['relative_path']
            dest_path = course_materials_dir / material['filename']
            shutil.copy2(source_path, dest_path)
            
            saved_materials.append({
                'filename': material['filename'],
                'file_path': str(dest_path),
                'relative_path': material['relative_path']
            })
        
        return saved_materials
    
    def get_course_materials(
        self,
        course_id: str,
        course: Dict[str, Any],
        topic: str = None
    ) -> Dict[str, Any]:
        """
        Get course materials, optionally filtered by topic.
        
        Args:
            course_id: Course identifier
            course: Course document
            topic: Optional topic filter
            
        Returns:
            Materials and mapping data
        """
        materials = course.get("course_materials", [])
        topic_mapping = course.get("material_topic_mapping", {})
        
        # Filter by topic if specified
        if topic:
            topic_files = topic_mapping.get(topic, [])
            materials = [m for m in materials if m['filename'] in topic_files]
        
        return {
            "course_id": course_id,
            "course_name": course.get("course_name"),
            "materials": materials,
            "topic_mapping": topic_mapping,
            "filtered_topic": topic
        }
    
    def get_material_content_for_topic(
        self,
        course_id: str,
        course: Dict[str, Any],
        topic: str
    ) -> str:
        """
        Get content for a specific topic from stored topic_content_mapping.
        Falls back to re-extracting from files if mapping not available.
        
        Args:
            course_id: Course identifier
            course: Course document
            topic: Topic to get materials for
            
        Returns:
            Combined text content from all relevant materials
        """
        # First, try to get from stored topic_content_mapping (new approach)
        topic_content_mapping = course.get("topic_content_mapping", {})
        
        if topic in topic_content_mapping and topic_content_mapping[topic]:
            return topic_content_mapping[topic]
        
        # Try matching by topic name (last part of path)
        topic_name = topic.split("/")[-1] if "/" in topic else topic
        for path, content in topic_content_mapping.items():
            if path.endswith(topic_name) or topic_name in path:
                if content:
                    return content
        
        # Fallback: Use parsed_materials if available
        parsed_materials = course.get("parsed_materials", {})
        topic_mapping = course.get("material_topic_mapping", {})
        
        topic_files = topic_mapping.get(topic, [])
        if not topic_files:
            # Try matching by topic name
            for path, files in topic_mapping.items():
                if path.endswith(topic_name) or topic_name in path:
                    topic_files = files
                    break
        
        if topic_files and parsed_materials:
            combined_content = []
            for filename in topic_files:
                if filename in parsed_materials:
                    content = parsed_materials[filename]
                    if content:
                        combined_content.append(f"--- From {filename} ---\n{content}")
            if combined_content:
                return "\n\n".join(combined_content)
        
        # Final fallback: Re-extract from files (legacy behavior)
        materials = course.get("course_materials", [])
        if not topic_files or not materials:
            return ""
        
        combined_content = []
        course_materials_dir = settings.UPLOAD_DIR / f"course_{course_id}_materials"
        
        for material in materials:
            if material['filename'] in topic_files:
                file_path = Path(material.get('file_path', ''))
                
                if not file_path.exists():
                    file_path = course_materials_dir / material['filename']
                
                if file_path.exists():
                    try:
                        content = self._extract_content(file_path)
                        if content:
                            combined_content.append(f"--- {material['filename']} ---\n{content}")
                    except Exception as e:
                        print(f"Error extracting content from {file_path}: {e}")
                        continue
        
        return "\n\n".join(combined_content) if combined_content else ""
    
    def get_all_material_content(
        self,
        course_id: str,
        course: Dict[str, Any]
    ) -> str:
        """
        Extract and combine content from all course materials.
        
        Args:
            course_id: Course identifier
            course: Course document
            
        Returns:
            Combined text content from all materials
        """
        materials = course.get("course_materials", [])
        
        if not materials:
            return ""
        
        # Extract content from each file
        combined_content = []
        course_materials_dir = settings.UPLOAD_DIR / f"course_{course_id}_materials"
        
        for material in materials:
            file_path = Path(material.get('file_path', ''))
            
            # If file_path doesn't exist, try constructing it
            if not file_path.exists():
                file_path = course_materials_dir / material['filename']
            
            if file_path.exists():
                try:
                    content = self._extract_content(file_path)
                    if content:
                        combined_content.append(f"--- {material['filename']} ---\n{content}")
                except Exception as e:
                    print(f"Error extracting content from {file_path}: {e}")
                    continue
        
        return "\n\n".join(combined_content) if combined_content else ""
