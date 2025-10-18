import os
import json
from typing import List
import docx
import PyPDF2
from pathlib import Path

def extract_text_from_pdf(file_path: str) -> str:
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text

def extract_text_from_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text

def extract_text_from_txt(file_path: str) -> str:
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

def process_uploaded_files(file_paths: List[str]) -> dict:
    """Process uploaded files and convert them to the required JSON format."""
    combined_text = ""
    
    for file_path in file_paths:
        ext = os.path.splitext(file_path)[1].lower()
        try:
            if ext == '.pdf':
                text = extract_text_from_pdf(file_path)
            elif ext == '.docx':
                text = extract_text_from_docx(file_path)
            elif ext == '.txt':
                text = extract_text_from_txt(file_path)
            else:
                continue
                
            combined_text += text + "\n\n"
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
            continue
    
    # Initialize default student proficiency data
    student_proficiency = {
        "student_id": "default",
        "proficiency_level": "intermediate",  # Default level
        "topics": {}  # Will be populated based on analysis
    }
    
    # Create a basic course material structure
    course_material = {
        "topics": ["introduction"],  # Will be expanded based on content analysis
        "introduction": combined_text
    }
    
    return {
        "course_material": course_material,
        "student_proficiency": student_proficiency
    }