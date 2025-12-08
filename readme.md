# Loop - AI-Powered Adaptive Learning Platform (previously known as Aware)

An intelligent educational platform that personalizes learning experiences through AI-driven test generation, performance analytics, and adaptive proficiency tracking.

## 🌟 Features

### For Professors
- **Course Management**: Create and manage courses with structured outlines
- **Material Upload**: Upload course materials (PDFs, PPTXs, DOCX) mapped to topics
- **Student Analytics**: Track student performance with detailed insights
- **Knowledge Graphs**: Visualize course structure and dependencies
- **AI Reports**: Generate comprehensive course reports using AI

### For Students
- **Personalized Tests**: AI-generated tests from uploaded course materials
- **Adaptive Difficulty**: Questions adjust based on proficiency level
- **Performance Tracking**: Monitor progress across topics and courses
- **Weak Topic Reinforcement**: Tests focus on areas needing improvement
- **Study Plans**: Get personalized study recommendations

## 🏗️ Architecture

```
aware/
├── app/                    # Backend (FastAPI)
│   ├── app.py             # Application entry point
│   ├── src/
│   │   ├── api/           # API routes
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data schemas
│   │   ├── database/      # MongoDB operations
│   │   ├── config/        # Settings
│   │   └── prompts/       # LLM prompt templates
│   └── uploads/           # Course materials storage
├── ui/                    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── services/      # API clients
│   │   └── contexts/      # React contexts
└── requirements.txt       # Python dependencies
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API key

### Backend Setup

1. **Clone and navigate to project**
```bash
cd /Users/yourname/loop/aware
```

2. **Create virtual environment**
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env and add:
# - GEMINI_API_KEY=your_gemini_api_key
# - MONGODB_URL=mongodb://localhost:27017/ (or Atlas URL)
# - SECRET_KEY=your_jwt_secret_key
```

5. **Start backend server**
```bash
cd app
python3 app.py
```
Server runs on `http://localhost:8000`

### Frontend Setup

1. **Navigate to UI directory**
```bash
cd ui
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

## 📚 Key Workflows

### Professor Workflow

1. **Create Course** (5-step process)
   - Enter course name and default proficiency
   - Upload course plan (JSON with topic outline)
   - Upload course materials (ZIP with PDFs/PPTXs/DOCX)
   - Set course objectives
   - Upload student roster (CSV)

2. **Material Mapping**
   - System automatically maps uploaded materials to topics using AI
   - Materials are parsed and content extracted for test generation

3. **Monitor Analytics**
   - View class performance metrics
   - Identify struggling students
   - Generate AI-powered course reports

### Student Workflow

1. **Enroll in Course**
   - Browse available courses
   - Enroll and set initial proficiency level

2. **Take Personalized Tests**
   - Select topic from course outline
   - System generates test from course materials
   - Questions adapt to proficiency and weak areas
   - 2-3 questions target previously weak topics

3. **Review Results**
   - See detailed test results
   - Track proficiency changes
   - View test history and progress

## 🔧 API Endpoints

### Authentication
```
POST /auth/register       # Register new user
POST /auth/login          # Login and get JWT token
GET  /auth/me            # Get current user info
POST /auth/logout        # Logout
```

### Courses (Professor)
```
POST   /course/init                          # Create new course
POST   /course/{id}/upload-plan             # Upload course plan JSON
POST   /course/{id}/upload-materials        # Upload materials ZIP
POST   /course/{id}/set-objectives          # Set course objectives
POST   /course/{id}/upload-roster           # Upload student roster
GET    /course/list                         # List all courses
GET    /course/{id}                         # Get course details
DELETE /course/{id}                         # Delete course
GET    /course/{id}/analytics               # Get course analytics
POST   /course/{id}/generate-report         # Generate AI report
```

### Students
```
GET  /student/available-courses             # Browse courses
POST /student/enroll                        # Enroll in course
GET  /student/enrolled-courses              # Get enrolled courses
POST /student/generate-test                 # Generate personalized test
POST /student/submit-test                   # Submit test answers
GET  /student/course/{id}/test-history     # View test history
```

### Tests
```
POST /test/generate-personalized            # Generate test from materials
```

## 🧠 AI-Powered Features

### Test Generation
- **Material-Based**: Questions generated from uploaded course content
- **Proficiency-Aware**: Difficulty adjusts to beginner/intermediate/advanced
- **Weak Topic Focus**: Reinforces areas needing improvement
- **Performance History**: Considers past test results

### Analytics
- **Class Performance**: Average scores, participation rates
- **Topic Analysis**: Performance by topic
- **Proficiency Distribution**: Student level breakdown
- **Trend Analysis**: Performance over time

### Adaptive Proficiency
Automatically adjusts based on last 3 tests:
- **Beginner**: <30% on 3 consecutive tests
- **Intermediate**: 30-70% on 2 of 3 tests
- **Advanced**: >70% on all 3 tests

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **MongoDB**: NoSQL database for flexibility
- **Google Gemini**: AI for test generation and analysis
- **JWT**: Secure authentication
- **PyPDF2/python-pptx/python-docx**: Document processing

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **TailwindCSS + shadcn/ui**: Modern UI components
- **Recharts**: Data visualization
- **React Router**: Navigation

## 📦 Database Schema

### Collections
- **users**: User accounts (professors/students)
- **courses**: Course information and materials
- **student_enrollments**: Student-course relationships
- **test_results**: Test submissions and scores
- **tokens**: JWT token blacklist

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Token blacklisting on logout
- Role-based access control (professor/student)
- CORS configuration for frontend

## 📝 Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_jwt_secret_key_here

# Optional
MONGODB_URL=mongodb://localhost:27017/
DATABASE_NAME=student_adaptive_learning
OPENAI_API_KEY=your_openai_key_for_reports  # Optional for reports
```

## 🎯 Personalized Test Generation

The system generates tests that:
1. Extract content from uploaded PDFs/PPTXs for the selected topic
2. Analyze student's past performance to identify weak areas
3. Generate questions directly from material content (not generic AI)
4. Include 2-3 questions addressing previously weak topics
5. Adjust difficulty based on current proficiency level

**Error Handling**: If no materials are uploaded for a topic, the system returns a clear error asking the professor to upload materials.

## 🚦 Development

### Run Tests
```bash
cd app
pytest
```

### Build for Production

**Backend**:
```bash
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker
```

**Frontend**:
```bash
npm run build
npm run preview
```

## 📖 Documentation

- [Personalized Test Feature Guide](PERSONALIZED_TEST_FEATURE.md)
- [Quick Start Guide](QUICKSTART.md)
- [Refactoring Guide](REFACTORING_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- MongoDB for flexible data storage
- shadcn/ui for beautiful UI components
- FastAPI for excellent Python web framework

## 📧 Support

For issues or questions, please open an issue on GitHub or contact the development team.

---

**Made with ❤️ for adaptive learning**
