"""Analytics service layer."""

from typing import Dict, List, Any
from src.database.operations import QueryDB


class AnalyticsService:
    """Business logic for analytics operations."""
    
    def __init__(self):
        self.query_db = QueryDB()
    
    def get_course_analytics(self, course_id: str) -> Dict[str, Any]:
        """
        Get comprehensive course analytics.
        
        Args:
            course_id: Course identifier
            
        Returns:
            Analytics data with topics, students, and summary statistics
        """
        # Get all enrolled students
        enrollments = self.query_db.find_enrolled_students_by_course(course_id)
        enrolled_students = {
            e["student_username"]: e.get("proficiency_level", "intermediate")
            for e in enrollments
        }
        
        # Get all test results
        test_results = self.query_db.find_test_results_by_course(course_id)
        
        # Organize data
        topic_analytics = {}
        student_analytics = {}
        
        for result in test_results:
            self._process_topic_analytics(result, topic_analytics)
            self._process_student_analytics(result, student_analytics, enrolled_students)
        
        # Calculate summaries
        topic_summary = self._calculate_topic_summary(topic_analytics)
        student_summary = self._calculate_student_summary(student_analytics)
        
        return {
            "summary": {
                "total_enrolled": len(enrolled_students),
                "students_with_tests": len(student_analytics),
                "total_tests_taken": sum(s["total_tests"] for s in student_summary),
                "total_topics_tested": len(topic_analytics)
            },
            "topic_analytics": topic_summary,
            "student_analytics": student_summary
        }
    
    def _process_topic_analytics(
        self,
        result: Dict[str, Any],
        topic_analytics: Dict[str, Any]
    ) -> None:
        """Process test result for topic analytics."""
        topic = result.get("topic")
        score = result.get("score", 0)
        total = result.get("total_questions", 10)
        percentage = result.get("percentage", 0)
        student = result.get("student_username")
        
        if topic not in topic_analytics:
            topic_analytics[topic] = {
                "topic": topic,
                "total_attempts": 0,
                "total_score": 0,
                "total_possible": 0,
                "students_tested": set(),
                "scores": []
            }
        
        topic_analytics[topic]["total_attempts"] += 1
        topic_analytics[topic]["total_score"] += score
        topic_analytics[topic]["total_possible"] += total
        topic_analytics[topic]["students_tested"].add(student)
        topic_analytics[topic]["scores"].append(percentage)
    
    def _process_student_analytics(
        self,
        result: Dict[str, Any],
        student_analytics: Dict[str, Any],
        enrolled_students: Dict[str, str]
    ) -> None:
        """Process test result for student analytics."""
        student = result.get("student_username")
        topic = result.get("topic")
        score = result.get("score", 0)
        total = result.get("total_questions", 10)
        percentage = result.get("percentage", 0)
        date = result.get("created_at")
        proficiency = result.get("proficiency_level", "intermediate")
        
        if student not in student_analytics:
            student_analytics[student] = {
                "student_username": student,
                "current_proficiency": enrolled_students.get(student, "intermediate"),
                "total_tests": 0,
                "total_score": 0,
                "total_possible": 0,
                "topics_tested": {},
                "test_history": []
            }
        
        student_analytics[student]["total_tests"] += 1
        student_analytics[student]["total_score"] += score
        student_analytics[student]["total_possible"] += total
        
        # Topic breakdown per student
        if topic not in student_analytics[student]["topics_tested"]:
            student_analytics[student]["topics_tested"][topic] = {
                "attempts": 0,
                "best_score": 0,
                "latest_score": 0,
                "scores": []
            }
        
        topic_data = student_analytics[student]["topics_tested"][topic]
        topic_data["attempts"] += 1
        topic_data["scores"].append(percentage)
        topic_data["latest_score"] = percentage
        topic_data["best_score"] = max(topic_data["best_score"], percentage)
        
        # Add to history
        student_analytics[student]["test_history"].append({
            "topic": topic,
            "score": score,
            "total": total,
            "percentage": percentage,
            "date": date,
            "proficiency": proficiency
        })
    
    def _calculate_topic_summary(
        self,
        topic_analytics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Calculate topic summary statistics."""
        topic_summary = []
        
        for topic_data in topic_analytics.values():
            total_possible = topic_data["total_possible"]
            avg_score = (
                (topic_data["total_score"] / total_possible * 100)
                if total_possible > 0 else 0
            )
            
            topic_summary.append({
                "topic": topic_data["topic"],
                "total_attempts": topic_data["total_attempts"],
                "students_tested": len(topic_data["students_tested"]),
                "average_score": round(avg_score, 2),
                "highest_score": round(max(topic_data["scores"]) if topic_data["scores"] else 0, 2),
                "lowest_score": round(min(topic_data["scores"]) if topic_data["scores"] else 0, 2)
            })
        
        # Sort by average score (lowest first to identify struggling topics)
        topic_summary.sort(key=lambda x: x["average_score"])
        
        return topic_summary
    
    def _calculate_student_summary(
        self,
        student_analytics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Calculate student summary statistics."""
        student_summary = []
        
        for student_data in student_analytics.values():
            total_possible = student_data["total_possible"]
            overall_percentage = (
                (student_data["total_score"] / total_possible * 100)
                if total_possible > 0 else 0
            )
            
            # Calculate average per topic
            topics_breakdown = []
            for topic, topic_info in student_data["topics_tested"].items():
                avg = (
                    sum(topic_info["scores"]) / len(topic_info["scores"])
                    if topic_info["scores"] else 0
                )
                
                topics_breakdown.append({
                    "topic": topic,
                    "attempts": topic_info["attempts"],
                    "best_score": round(topic_info["best_score"], 2),
                    "latest_score": round(topic_info["latest_score"], 2),
                    "average_score": round(avg, 2)
                })
            
            student_summary.append({
                "student_username": student_data["student_username"],
                "current_proficiency": student_data["current_proficiency"],
                "total_tests": student_data["total_tests"],
                "overall_percentage": round(overall_percentage, 2),
                "topics_breakdown": topics_breakdown,
                "recent_tests": sorted(
                    student_data["test_history"],
                    key=lambda x: x["date"],
                    reverse=True
                )[:5]
            })
        
        # Sort by overall performance (descending)
        student_summary.sort(key=lambda x: x["overall_percentage"], reverse=True)
        
        return student_summary
    
    def prepare_report_data(self, course_id: str) -> Dict[str, Any]:
        """
        Prepare analytics data for AI report generation.
        
        Args:
            course_id: Course identifier
            
        Returns:
            Structured data for report generation
        """
        enrollments = self.query_db.find_enrolled_students_by_course(course_id)
        enrolled_students = {
            e["student_username"]: e.get("proficiency_level", "intermediate")
            for e in enrollments
        }
        
        test_results = self.query_db.find_test_results_by_course(course_id)
        
        if not test_results:
            return {"has_data": False}
        
        # Organize data
        topic_stats = {}
        proficiency_distribution = {"beginner": 0, "intermediate": 0, "advanced": 0}
        student_performance = {}
        
        for result in test_results:
            self._aggregate_topic_stats(result, topic_stats)
            self._aggregate_student_performance(result, student_performance, enrolled_students)
        
        # Count proficiency distribution
        for student_data in student_performance.values():
            prof = student_data["current_proficiency"]
            if prof in proficiency_distribution:
                proficiency_distribution[prof] += 1
        
        # Calculate statistics
        topic_summary = self._prepare_topic_summary(topic_stats)
        total_enrolled = len(enrolled_students)
        students_with_tests = len(student_performance)
        participation_rate = (
            (students_with_tests / total_enrolled * 100)
            if total_enrolled > 0 else 0
        )
        
        overall_scores = [
            (s["total_score"] / s["total_possible"]) * 100
            for s in student_performance.values()
            if s["total_possible"] > 0
        ]
        class_average = sum(overall_scores) / len(overall_scores) if overall_scores else 0
        
        return {
            "has_data": True,
            "total_enrolled": total_enrolled,
            "students_with_tests": students_with_tests,
            "participation_rate": participation_rate,
            "class_average": class_average,
            "proficiency_distribution": proficiency_distribution,
            "topic_summary": topic_summary,
            "total_tests": sum(s["total_tests"] for s in student_performance.values())
        }
    
    def _aggregate_topic_stats(
        self,
        result: Dict[str, Any],
        topic_stats: Dict[str, Any]
    ) -> None:
        """Aggregate topic statistics."""
        topic = result.get("topic")
        score = result.get("score", 0)
        total = result.get("total_questions", 10)
        percentage = result.get("percentage", 0)
        student = result.get("student_username")
        
        if topic not in topic_stats:
            topic_stats[topic] = {
                "attempts": 0,
                "total_score": 0,
                "total_possible": 0,
                "scores": [],
                "students": set()
            }
        
        topic_stats[topic]["attempts"] += 1
        topic_stats[topic]["total_score"] += score
        topic_stats[topic]["total_possible"] += total
        topic_stats[topic]["scores"].append(percentage)
        topic_stats[topic]["students"].add(student)
    
    def _aggregate_student_performance(
        self,
        result: Dict[str, Any],
        student_performance: Dict[str, Any],
        enrolled_students: Dict[str, str]
    ) -> None:
        """Aggregate student performance data."""
        student = result.get("student_username")
        score = result.get("score", 0)
        total = result.get("total_questions", 10)
        
        if student not in student_performance:
            student_performance[student] = {
                "total_tests": 0,
                "total_score": 0,
                "total_possible": 0,
                "current_proficiency": enrolled_students.get(student, "intermediate")
            }
        
        student_performance[student]["total_tests"] += 1
        student_performance[student]["total_score"] += score
        student_performance[student]["total_possible"] += total
    
    def _prepare_topic_summary(
        self,
        topic_stats: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Prepare topic summary for report."""
        topic_summary = []
        
        for topic, stats in topic_stats.items():
            avg_score = (
                (stats["total_score"] / stats["total_possible"] * 100)
                if stats["total_possible"] > 0 else 0
            )
            
            topic_summary.append({
                "topic": topic,
                "average_score": round(avg_score, 2),
                "attempts": stats["attempts"],
                "students_tested": len(stats["students"]),
                "highest_score": round(max(stats["scores"]) if stats["scores"] else 0, 2),
                "lowest_score": round(min(stats["scores"]) if stats["scores"] else 0, 2)
            })
        
        # Sort by performance (lowest first)
        topic_summary.sort(key=lambda x: x["average_score"])
        
        return topic_summary
