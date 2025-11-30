# Quick Start Guide - Testing Personalized Test Feature

## Prerequisites

1. **Python Environment**: Python 3.10+ with virtual environment
2. **MongoDB**: Running MongoDB instance (local or Atlas)
3. **API Keys**: Google Gemini API key

## Step 1: Setup Environment

### 1.1 Activate Virtual Environment
```bash
cd /Users/malavika/loop/aware
source capstone_env/bin/activate
```

### 1.2 Install Dependencies
```bash
pip install -r requirements.txt
```

### 1.3 Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your keys
nano .env
```

Add these required variables:
```env
# Google Gemini API Key (Required for test generation)
GEMINI_API_KEY=your_actual_gemini_api_key_here

# OpenAI API Key (Optional - for course reports)
OPENAI_API_KEY=your_openai_key_here

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/
DATABASE_NAME=adaptive_learning

# JWT Secret
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256

# Upload Directory
UPLOAD_DIR=./app/uploads
```

## Step 2: Start MongoDB

### Option A: Local MongoDB
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or check if already running
mongosh
```

### Option B: MongoDB Atlas
Update `.env` with your Atlas connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

## Step 3: Run the Backend API

```bash
cd /Users/malavika/loop/aware/app

# Run with uvicorn
python app.py

# Or directly with uvicorn
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
✓ Database indexes ensured
✓ Upload directory: ./app/uploads
✓ API server ready
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Step 4: Test the API

### 4.1 Open API Documentation
Visit: http://localhost:8000/docs

This opens the interactive Swagger UI where you can test all endpoints.

### 4.2 Test Basic Health Check
```bash
curl http://localhost:8000/health
```

## Step 5: Test the Personalized Test Feature

### 5.1 Register Users
```bash
# Register a professor
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "prof_test",
    "password": "testpass123",
    "role": "professor",
    "email": "prof@test.com"
  }'

# Register a student
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student_test",
    "password": "testpass123",
    "role": "student",
    "email": "student@test.com"
  }'
```

### 5.2 Login and Get Tokens
```bash
# Login as professor
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "prof_test",
    "password": "testpass123"
  }'

# Save the access_token from response
```

### 5.3 Create a Course (as Professor)
```bash
curl -X POST http://localhost:8000/course/init \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PROFESSOR_TOKEN" \
  -d '{
    "course_name": "Data Structures",
    "default_proficiency": "intermediate"
  }'

# Save the course_id from response
```

### 5.4 Upload Course Plan
```bash
# You have data_structures_course_outline.json in the repo
curl -X POST http://localhost:8000/course/COURSE_ID/upload-plan \
  -H "Authorization: Bearer YOUR_PROFESSOR_TOKEN" \
  -F "plan_file=@data_structures_course_outline.json"
```

### 5.5 Upload Course Materials
```bash
# You have dsa_course_material.zip in the repo
curl -X POST http://localhost:8000/course/COURSE_ID/upload-materials \
  -H "Authorization: Bearer YOUR_PROFESSOR_TOKEN" \
  -F "materials_zip=@dsa_course_material.zip"
```

### 5.6 Enroll Student (as Student)
```bash
# Login as student first to get token
curl -X POST http://localhost:8000/student/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -d '{
    "course_id": "COURSE_ID",
    "default_proficiency": "intermediate"
  }'
```

### 5.7 Generate Personalized Test (as Student)
```bash
curl -X POST http://localhost:8000/test/generate-personalized \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -d '{
    "course_id": "COURSE_ID",
    "topic": "Arrays",
    "num_questions": 5,
    "use_materials": true
  }'
```

## Step 6: Using the Swagger UI (Easier!)

1. Go to http://localhost:8000/docs
2. Click "Authorize" button at the top
3. Login and paste your token: `Bearer YOUR_TOKEN`
4. Click "Authorize" and "Close"
5. Now you can test all endpoints by clicking "Try it out"

### Test Flow in Swagger:
1. **POST /auth/register** - Create professor & student accounts
2. **POST /auth/login** - Get tokens (authorize with these)
3. **POST /course/init** - Create a course
4. **POST /course/{id}/upload-plan** - Upload JSON course plan
5. **POST /course/{id}/upload-materials** - Upload ZIP materials
6. **POST /student/enroll** - Enroll student in course
7. **POST /test/generate-personalized** - Generate personalized test! 🎯
8. **POST /test/submit** - Submit test answers

## Step 7: Run the Frontend (Optional)

```bash
cd /Users/malavika/loop/aware/ui

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun run dev
```

Visit: http://localhost:5173

## Testing the New Feature

### Compare Standard vs Personalized Tests

**Standard Test** (from course plan):
```bash
POST /test/generate
{
  "course_id": "...",
  "topic": "Arrays",
  "num_questions": 5
}
```
- Questions based on course outline
- No personalization

**Personalized Test** (from materials):
```bash
POST /test/generate-personalized
{
  "course_id": "...",
  "topic": "Arrays",
  "num_questions": 5,
  "use_materials": true
}
```
- Questions from actual PDF/PPTX content
- Addresses student's weak topics
- Adapts to proficiency level

## Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
brew services list

# Start MongoDB
brew services start mongodb-community
```

### Import Errors
```bash
# Make sure you're in virtual environment
source capstone_env/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### API Key Issues
```bash
# Verify .env file exists
cat .env

# Check if keys are loaded
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('GEMINI_API_KEY'))"
```

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
uvicorn app:app --reload --port 8001
```

## Quick Test Script

Save this as `test_feature.sh`:
```bash
#!/bin/bash

API_BASE="http://localhost:8000"

echo "🧪 Testing Personalized Test Feature..."

# 1. Register and login
echo "1. Creating test accounts..."
PROF_TOKEN=$(curl -s -X POST $API_BASE/auth/register -H "Content-Type: application/json" \
  -d '{"username":"prof1","password":"pass123","role":"professor"}' | \
  curl -s -X POST $API_BASE/auth/login -H "Content-Type: application/json" \
  -d '{"username":"prof1","password":"pass123"}' | jq -r '.access_token')

echo "✓ Professor logged in"

# 2. Create course
COURSE_ID=$(curl -s -X POST $API_BASE/course/init \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course_name":"Test Course"}' | jq -r '.course_id')

echo "✓ Course created: $COURSE_ID"

# Continue with more steps...
```

## Expected Output

When generating a personalized test, you should see:
```json
{
  "message": "Personalized test generated successfully",
  "topic": "Arrays",
  "proficiency_level": "intermediate",
  "personalization": {
    "based_on_history": true,
    "weak_topics_addressed": 2,
    "total_past_tests": 3
  },
  "test": {
    "questions": [
      {
        "question_number": 1,
        "question_text": "Based on the lecture materials, what is...",
        "options": {...},
        "correct_answer": "B"
      }
    ],
    "personalized": true,
    "based_on_materials": true
  }
}
```

## Next Steps

1. Take multiple tests to build history
2. Check how weak topics are identified
3. See personalization improve over time
4. Compare material-based vs outline-based questions

Happy testing! 🚀
