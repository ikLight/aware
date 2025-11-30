"""
Example usage of the Personalized Test Generation feature.

This script demonstrates how to use the new API endpoints to:
1. Upload course materials
2. Generate personalized tests based on those materials
3. Access student performance history

Note: This is a demonstration script. Update the API_BASE_URL and tokens as needed.
"""

import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8000"
PROFESSOR_TOKEN = "your_professor_token_here"
STUDENT_TOKEN = "your_student_token_here"


def upload_course_plan(course_id: str, plan_file_path: str):
    """Upload course plan JSON file."""
    print(f"\n📚 Uploading course plan for course {course_id}...")
    
    with open(plan_file_path, 'rb') as f:
        files = {'plan_file': f}
        headers = {'Authorization': f'Bearer {PROFESSOR_TOKEN}'}
        
        response = requests.post(
            f"{API_BASE_URL}/course/{course_id}/upload-plan",
            files=files,
            headers=headers
        )
    
    if response.status_code == 200:
        print("✅ Course plan uploaded successfully")
        return response.json()
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None


def upload_course_materials(course_id: str, materials_zip_path: str):
    """Upload course materials ZIP file."""
    print(f"\n📦 Uploading course materials for course {course_id}...")
    
    with open(materials_zip_path, 'rb') as f:
        files = {'materials_zip': f}
        headers = {'Authorization': f'Bearer {PROFESSOR_TOKEN}'}
        
        response = requests.post(
            f"{API_BASE_URL}/course/{course_id}/upload-materials",
            files=files,
            headers=headers
        )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Materials uploaded successfully")
        print(f"   - Materials count: {result.get('materials_count')}")
        print(f"   - Topics mapped: {len(result.get('topic_mapping', {}))}")
        return result
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None


def generate_standard_test(course_id: str, topic: str, num_questions: int = 5):
    """Generate a standard test (from course plan)."""
    print(f"\n📝 Generating standard test for '{topic}'...")
    
    headers = {
        'Authorization': f'Bearer {STUDENT_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        "course_id": course_id,
        "topic": topic,
        "num_questions": num_questions
    }
    
    response = requests.post(
        f"{API_BASE_URL}/test/generate",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Standard test generated")
        print(f"   - Topic: {result['topic']}")
        print(f"   - Difficulty: {result['difficulty']}")
        print(f"   - Questions: {len(result['test']['questions'])}")
        return result
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None


def generate_personalized_test(course_id: str, topic: str, num_questions: int = 5):
    """Generate a personalized test from course materials."""
    print(f"\n🎯 Generating personalized test for '{topic}'...")
    
    headers = {
        'Authorization': f'Bearer {STUDENT_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        "course_id": course_id,
        "topic": topic,
        "num_questions": num_questions,
        "use_materials": True
    }
    
    response = requests.post(
        f"{API_BASE_URL}/test/generate-personalized",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Personalized test generated")
        print(f"   - Topic: {result['topic']}")
        print(f"   - Proficiency level: {result['proficiency_level']}")
        print(f"   - Questions: {len(result['test']['questions'])}")
        
        personalization = result.get('personalization', {})
        print(f"   - Based on history: {personalization.get('based_on_history')}")
        print(f"   - Weak topics addressed: {personalization.get('weak_topics_addressed')}")
        print(f"   - Past tests: {personalization.get('total_past_tests')}")
        
        # Show first question as example
        if result['test']['questions']:
            q = result['test']['questions'][0]
            print(f"\n   Sample Question:")
            print(f"   Q: {q.get('question_text', q.get('question'))}")
            print(f"   Options: {', '.join(q['options'].keys())}")
        
        return result
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None


def submit_test(course_id: str, topic: str, questions: list, answers: dict):
    """Submit test answers."""
    print(f"\n📤 Submitting test answers...")
    
    headers = {
        'Authorization': f'Bearer {STUDENT_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        "course_id": course_id,
        "topic": topic,
        "questions": questions,
        "answers": answers
    }
    
    response = requests.post(
        f"{API_BASE_URL}/test/submit",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Test submitted")
        print(f"   - Score: {result['score']}/{result['total_questions']}")
        print(f"   - Percentage: {result['percentage']}%")
        return result
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None


def get_test_history(course_id: str):
    """Get student's test history."""
    print(f"\n📊 Fetching test history...")
    
    headers = {'Authorization': f'Bearer {STUDENT_TOKEN}'}
    
    response = requests.get(
        f"{API_BASE_URL}/test/history/{course_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        result = response.json()
        history = result.get('test_history', [])
        print(f"✅ Test history retrieved: {len(history)} tests")
        
        for test in history:
            print(f"   - {test['topic']}: {test['percentage']}% ({test['proficiency_level']})")
        
        return result
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None


def compare_tests(course_id: str, topic: str):
    """Compare standard vs personalized test generation."""
    print("\n" + "="*60)
    print("COMPARING: Standard vs Personalized Test Generation")
    print("="*60)
    
    # Generate standard test
    standard = generate_standard_test(course_id, topic, num_questions=3)
    
    # Generate personalized test
    personalized = generate_personalized_test(course_id, topic, num_questions=3)
    
    print("\n" + "="*60)
    print("COMPARISON SUMMARY")
    print("="*60)
    
    if standard and personalized:
        print("\nStandard Test:")
        print(f"  - Based on: Course plan outline")
        print(f"  - Personalization: None")
        
        print("\nPersonalized Test:")
        print(f"  - Based on: Uploaded course materials")
        print(f"  - Personalization: Student history & weak topics")
        print(f"  - Questions are specific to material content")
        
        print("\n💡 Recommendation: Use personalized tests for better learning outcomes!")


# Example workflow
if __name__ == "__main__":
    print("="*60)
    print("PERSONALIZED TEST GENERATION - DEMO")
    print("="*60)
    
    # Example course ID (update with actual course ID)
    COURSE_ID = "your_course_id_here"
    TOPIC = "Arrays"
    
    print("\n⚠️  Update the following variables before running:")
    print(f"   - API_BASE_URL: {API_BASE_URL}")
    print(f"   - PROFESSOR_TOKEN: {PROFESSOR_TOKEN}")
    print(f"   - STUDENT_TOKEN: {STUDENT_TOKEN}")
    print(f"   - COURSE_ID: {COURSE_ID}")
    
    print("\n📋 Example workflow:")
    print("   1. Professor uploads course plan")
    print("   2. Professor uploads materials (ZIP)")
    print("   3. Student generates personalized test")
    print("   4. Student submits test")
    print("   5. System learns from results")
    print("   6. Future tests are better personalized")
    
    # Uncomment to run actual API calls:
    # compare_tests(COURSE_ID, TOPIC)
    # get_test_history(COURSE_ID)
