# Personalized Test Generation from Course Materials

## Overview

This feature enables the generation of personalized tests for students based on course materials uploaded by professors. The system:

1. **Parses uploaded materials** (PDF, PPTX) and extracts their content
2. **Analyzes student performance** to identify weak topics
3. **Generates customized tests** that address individual learning needs
4. **Adapts difficulty** based on student proficiency level

## How It Works

### For Professors

1. **Upload Course Plan** (JSON file with course outline)
   - Endpoint: `POST /course/{course_id}/upload-plan`

2. **Upload Course Materials** (ZIP file containing PDFs/PPTXs)
   - Endpoint: `POST /course/{course_id}/upload-materials`
   - Materials are automatically mapped to topics using AI
   - Supports: `.pdf`, `.pptx`, `.ppt` files

### For Students

1. **Generate Personalized Test**
   - Endpoint: `POST /test/generate-personalized`
   - Request body:
     ```json
     {
       "course_id": "course_id_here",
       "topic": "Topic Name", 
       "num_questions": 10,
       "use_materials": true
     }
     ```

2. **Test Generation Process**:
   - System retrieves materials mapped to the selected topic
   - Analyzes student's past performance to identify weak areas
   - Generates questions directly from material content
   - Adjusts difficulty based on proficiency level (beginner/intermediate/advanced)
   - Includes 2-3 questions addressing weak topics for reinforcement

3. **Response**:
   ```json
   {
     "message": "Personalized test generated successfully",
     "topic": "Topic Name",
     "proficiency_level": "intermediate",
     "personalization": {
       "based_on_history": true,
       "weak_topics_addressed": 2,
       "total_past_tests": 5
     },
     "test": {
       "topic": "Topic Name",
       "proficiency_level": "intermediate",
       "num_questions": 10,
       "questions": [...],
       "personalized": true,
       "based_on_materials": true
     }
   }
   ```

## API Endpoints

### Generate Personalized Test
```
POST /test/generate-personalized
Authorization: Bearer <token>
Content-Type: application/json

{
  "course_id": "string",
  "topic": "string",
  "num_questions": 10,
  "use_materials": true
}
```

**Features**:
- Extracts content from uploaded course materials
- Considers student's weak topics from past performance
- Adjusts difficulty based on proficiency level
- Falls back to course plan if no materials available for topic

### Original Test Generation (still available)
```
POST /test/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "course_id": "string",
  "topic": "string",
  "num_questions": 10
}
```

**Difference**: Uses course plan outline instead of uploaded materials.

## Personalization Features

### 1. Material-Based Questions
- Questions are generated directly from uploaded PDF/PPTX content
- References specific concepts, examples, and details from materials
- Ensures relevance to what was actually taught

### 2. Performance-Based Adaptation
- Analyzes student's test history in the course
- Identifies weak topics (avg score < 60%)
- Includes reinforcement questions for weak areas
- Maintains appropriate difficulty level

### 3. Proficiency-Based Difficulty
- **Beginner**: Basic concepts, definitions, simple applications
- **Intermediate**: Application problems, analysis, concept connections
- **Advanced**: Complex scenarios, critical thinking, synthesis

## Implementation Details

### Services Added/Modified

1. **MaterialService** (`material_service.py`)
   - `get_material_content_for_topic()`: Extracts content for specific topic
   - `get_all_material_content()`: Extracts all course material content

2. **TestService** (`test_service.py`)
   - `get_student_proficiency_history()`: Analyzes performance to identify weak topics

3. **AIService** (`ai_service.py`)
   - `generate_personalized_test_from_materials()`: Generates test from materials with personalization

4. **PromptTemplates** (`prompts/templates.py`)
   - `personalized_test_generation()`: Enhanced prompt for material-based generation

### Database Schema

No changes to database schema required. Uses existing collections:
- `courses`: Stores `course_materials` and `material_topic_mapping`
- `test_results`: Used to analyze student performance
- `student_enrollments`: Tracks proficiency levels

## Example Workflow

### Complete Flow
```
1. Professor creates course
   POST /course/init {"course_name": "Data Structures"}

2. Professor uploads course plan
   POST /course/{id}/upload-plan
   File: course_outline.json

3. Professor uploads materials
   POST /course/{id}/upload-materials
   File: materials.zip (containing PDFs/PPTXs)

4. Student enrolls in course
   POST /student/enroll {"course_id": "{id}"}

5. Student takes initial test (builds history)
   POST /test/generate-personalized
   POST /test/submit

6. Student takes more tests (system learns weak topics)
   - Each test improves personalization
   - System identifies struggling areas
   - Future tests address weak topics

7. Student gets personalized test
   POST /test/generate-personalized
   - Questions from actual materials
   - Reinforcement for weak topics
   - Appropriate difficulty level
```

## Benefits

### For Students
- ✅ Tests based on actual course materials (not generic content)
- ✅ Questions address personal weak areas
- ✅ Progressive difficulty adaptation
- ✅ Targeted learning and improvement

### For Professors
- ✅ Automated test generation from uploaded materials
- ✅ Ensures alignment with taught content
- ✅ Adaptive to each student's needs
- ✅ No manual test creation required

## Fallback Behavior

If no materials are available for a topic:
1. System checks for materials mapped to the topic
2. If none found, falls back to course plan content
3. Generates test from course outline instead
4. Response indicates `"based_on_materials": false`

This ensures students can always generate tests, even if materials are partially uploaded.

## Configuration

Required environment variables:
- `GEMINI_API_KEY`: For AI test generation
- `UPLOAD_DIR`: Directory for storing course materials

The system uses:
- `GEMINI_MODEL_TEST`: For test generation (typically `gemini-1.5-pro`)
- Structured JSON output for consistent test format

## Error Handling

- **No materials uploaded**: Clear error message prompting professor to upload
- **Topic not found**: Falls back to course plan or returns helpful error
- **No performance history**: Still generates personalized test (without weak topic focus)
- **Material extraction fails**: Skips problematic files, uses available content

## Future Enhancements

Potential improvements:
- Support for more file types (Word, images with OCR)
- Question bank building and reuse
- Topic coverage tracking
- Difficulty progression over time
- Multi-modal content (videos, code snippets)
- Collaborative filtering for personalization
