"""Test and assessment service layer."""

from typing import Dict, List, Any, Optional
from bson import ObjectId
from src.database.operations import AtomicDB, QueryDB


class TestService:
    """Business logic for test operations."""
    
    def __init__(self):
        self.atomic_db = AtomicDB()
        self.query_db = QueryDB()
    
    def extract_topic_content(
        self,
        course_plan: Dict[str, Any],
        target_topic: str
    ) -> str:
        """
        Extract content for a specific topic from course plan.
        
        Args:
            course_plan: Course plan JSON
            target_topic: Topic label to find
            
        Returns:
            Topic content string
        """
        def find_content(items: List[Dict], target: str) -> str:
            """Recursively search for topic content."""
            for item in items:
                label = item.get("label", "")
                
                if label == target:
                    # Found the topic - extract content
                    content_parts = []
                    if "children" in item and isinstance(item["children"], list):
                        for child in item["children"]:
                            if child.get("label"):
                                content_parts.append(child["label"])
                    
                    return " | ".join(content_parts) if content_parts else target
                
                # Search in children
                if "children" in item and isinstance(item["children"], list):
                    result = find_content(item["children"], target)
                    if result:
                        return result
            
            return ""
        
        content = ""
        if isinstance(course_plan, dict) and "outline" in course_plan:
            outline = course_plan["outline"]
            if isinstance(outline, list):
                content = find_content(outline, target_topic)
        
        return content or f"Topic: {target_topic}"
    
    def extract_topics_from_outline(
        self,
        course_plan: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Extract all topics from course outline.
        
        Args:
            course_plan: Course plan JSON
            
        Returns:
            List of topics with label and path
        """
        def extract_topics(items: List[Dict]) -> List[str]:
            """Recursively extract topic labels."""
            extracted = []
            
            if not isinstance(items, list):
                return extracted
            
            for item in items:
                if not isinstance(item, dict):
                    continue
                
                label = item.get("label", "")
                
                # Skip unit/week headers
                if label and not (
                    label.lower().startswith("unit ") or
                    label.lower().startswith("week ") or
                    ("unit" in label.lower() and ":" in label)
                ):
                    extracted.append(label)
                
                # Recursively process children
                if "children" in item and isinstance(item["children"], list):
                    child_topics = extract_topics(item["children"])
                    extracted.extend(child_topics)
            
            return extracted
        
        topics = []
        if isinstance(course_plan, dict) and "outline" in course_plan:
            outline = course_plan["outline"]
            if isinstance(outline, list):
                topic_labels = extract_topics(outline)
                topics = [{"label": label, "full_path": label} for label in topic_labels]
        
        return topics
    
    def submit_test(
        self,
        student_username: str,
        course_id: str,
        course_name: str,
        topic: str,
        proficiency_level: str,
        questions: List[Dict[str, Any]],
        student_answers: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Submit test answers and calculate score.
        
        Args:
            student_username: Student's username
            course_id: Course identifier
            course_name: Course name
            topic: Topic tested
            proficiency_level: Student's proficiency level
            questions: List of question objects
            student_answers: Student's answers
            
        Returns:
            Test result with score and statistics
        """
        # Calculate score
        correct_answers = {}
        for question in questions:
            q_num = question.get("question_number")
            correct_ans = question.get("correct_answer")
            if q_num and correct_ans:
                correct_answers[str(q_num)] = correct_ans
        
        score = 0
        for q_num, student_ans in student_answers.items():
            if correct_answers.get(str(q_num)) == student_ans:
                score += 1
        
        total_questions = len(questions)
        percentage = (score / total_questions * 100) if total_questions > 0 else 0
        
        # Save to database
        test_result_doc = {
            "student_username": student_username,
            "course_id": course_id,
            "course_name": course_name,
            "topic": topic,
            "proficiency_level": proficiency_level,
            "questions": questions,
            "student_answers": student_answers,
            "correct_answers": correct_answers,
            "score": score,
            "total_questions": total_questions,
            "percentage": round(percentage, 2)
        }
        
        test_id = self.atomic_db.insert_test_result(test_result_doc)
        
        # Calculate and update adaptive proficiency
        new_proficiency = self.atomic_db.calculate_and_update_adaptive_proficiency(
            student_username,
            course_id
        )
        
        return {
            "test_id": test_id,
            "score": score,
            "total_questions": total_questions,
            "percentage": round(percentage, 2),
            "proficiency_updated": new_proficiency
        }
    
    def get_test_history(
        self,
        student_username: str,
        course_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get test history for a student in a course.
        
        Args:
            student_username: Student's username
            course_id: Course identifier
            
        Returns:
            List of test results with summary information
        """
        test_results = self.query_db.find_test_results_by_student(
            student_username,
            course_id
        )
        
        # Format results for summary view
        formatted_results = []
        for result in test_results:
            formatted_results.append({
                "_id": str(result["_id"]),
                "submitted_at": result.get("submitted_at"),
                "topic": result.get("topic"),
                "score": result.get("score"),
                "total_questions": result.get("total_questions"),
                "percentage": result.get("percentage"),
                "proficiency_level": result.get("proficiency_level", "intermediate"),
                "course_name": result.get("course_name", "Unknown Course")
            })
        
        return formatted_results
    
    def get_test_result_details(
        self,
        test_id: str,
        student_username: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed test result including questions and answers for review.
        
        Args:
            test_id: Test result identifier
            student_username: Student's username (for verification)
            
        Returns:
            Detailed test result or None if not found
        """
        try:
            result = self.query_db.db.test_results.find_one({
                "_id": ObjectId(test_id),
                "student_username": student_username
            })
            
            if not result:
                return None
            
            # Build detailed review with question-by-question analysis
            questions_review = []
            for question in result.get("questions", []):
                q_num = str(question.get("question_number"))
                student_answer = result.get("student_answers", {}).get(q_num)
                correct_answer = result.get("correct_answers", {}).get(q_num)
                
                questions_review.append({
                    "question_number": question.get("question_number"),
                    "question": question.get("question"),
                    "options": question.get("options", {}),
                    "student_answer": student_answer,
                    "correct_answer": correct_answer,
                    "is_correct": student_answer == correct_answer,
                    "explanation": question.get("explanation", "")
                })
            
            return {
                "_id": str(result["_id"]),
                "course_name": result.get("course_name"),
                "topic": result.get("topic"),
                "submitted_at": result.get("submitted_at"),
                "proficiency_level": result.get("proficiency_level"),
                "score": result.get("score"),
                "total_questions": result.get("total_questions"),
                "percentage": result.get("percentage"),
                "questions_review": questions_review
            }
            
        except Exception as e:
            print(f"Error fetching test details: {e}")
            return None
    
    def get_student_proficiency_history(
        self,
        student_username: str,
        course_id: str
    ) -> Dict[str, Any]:
        """
        Get student's performance history to help personalize tests.
        
        Args:
            student_username: Student's username
            course_id: Course identifier
            
        Returns:
            Performance metrics including weak topics
        """
        test_results = self.query_db.find_test_results_by_student(
            student_username,
            course_id
        )
        
        if not test_results:
            return {
                "has_history": False,
                "weak_topics": [],
                "strong_topics": [],
                "overall_performance": "intermediate"
            }
        
        # Analyze performance by topic
        topic_performance = {}
        for result in test_results:
            topic = result.get("topic")
            percentage = result.get("percentage", 0)
            
            if topic not in topic_performance:
                topic_performance[topic] = []
            topic_performance[topic].append(percentage)
        
        # Calculate averages
        weak_topics = []
        strong_topics = []
        
        for topic, scores in topic_performance.items():
            avg_score = sum(scores) / len(scores)
            if avg_score < 60:
                weak_topics.append({"topic": topic, "avg_score": round(avg_score, 2)})
            elif avg_score >= 80:
                strong_topics.append({"topic": topic, "avg_score": round(avg_score, 2)})
        
        # Sort by score
        weak_topics.sort(key=lambda x: x["avg_score"])
        strong_topics.sort(key=lambda x: x["avg_score"], reverse=True)
        
        # Overall performance
        all_scores = [r.get("percentage", 0) for r in test_results]
        overall_avg = sum(all_scores) / len(all_scores) if all_scores else 50
        
        if overall_avg < 60:
            overall = "beginner"
        elif overall_avg >= 80:
            overall = "advanced"
        else:
            overall = "intermediate"
        
        return {
            "has_history": True,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "overall_performance": overall,
            "total_tests": len(test_results)
        }
