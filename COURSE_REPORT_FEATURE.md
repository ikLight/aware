# AI Course Report Feature

## Overview
Added an AI-powered course report generation feature for professors on the course analytics page. This feature uses Gemini AI to analyze class performance data and generate comprehensive insights.

## Backend Changes

### New API Endpoint: `/course/{course_id}/generate-report`
- **Method**: POST
- **Authentication**: Professor only
- **Purpose**: Generate AI-powered comprehensive course performance report

#### What it analyzes:
1. **Overall Class Performance**
   - Participation rate (% of students who have taken tests)
   - Class average score
   - Total tests taken

2. **Topic-Specific Analysis**
   - Average scores per topic
   - Topics where students excel vs struggle
   - Test attempt counts per topic
   - Score ranges (lowest to highest)

3. **Proficiency Distribution**
   - Count of students at each proficiency level (beginner/intermediate/advanced)
   - Proficiency progression insights

4. **Student Engagement**
   - Number of active vs enrolled students
   - Participation patterns

#### AI Prompt Structure:
The endpoint creates a comprehensive prompt that includes:
- Course name and enrollment statistics
- Proficiency distribution breakdown
- Detailed topic performance (sorted by difficulty)
- Request for specific sections:
  1. Overall class performance summary
  2. Topic-specific analysis (strengths & struggles)
  3. Proficiency insights & recommendations
  4. Actionable teaching strategies
  5. Strengths and improvement opportunities

#### Response Format:
```json
{
  "report": "AI-generated markdown formatted report text",
  "has_data": true,
  "statistics": {
    "total_enrolled": 25,
    "students_with_tests": 18,
    "participation_rate": 72.0,
    "class_average": 78.5,
    "total_tests": 45,
    "topics_covered": 8,
    "proficiency_distribution": {
      "beginner": 5,
      "intermediate": 10,
      "advanced": 3
    }
  }
}
```

## Frontend Changes (ui/src/pages/Prof.tsx)

### New State Variables:
```typescript
const [courseReport, setCourseReport] = useState<string | null>(null);
const [isGeneratingReport, setIsGeneratingReport] = useState(false);
const [showReport, setShowReport] = useState(false);
```

### New Function: `generateCourseReport()`
- Calls the backend API endpoint
- Handles loading states
- Shows toast notifications
- Manages report display state

### UI Components Added:

1. **AI Course Report Card** - Positioned right after summary statistics cards
   - Beautiful gradient background (indigo/purple)
   - Clear header with AI icon
   - "Generate Report" button with loading animation
   - Collapsible report display area

2. **Report Display**
   - Animated slide-in transition (AnimatePresence)
   - Clean, readable white/dark card
   - Prose formatting for AI-generated text
   - Close button to hide report

3. **Visual Features**
   - Rotating "Zap" icon while generating
   - Professional gradient background
   - Responsive design
   - Dark mode support

## Usage Flow

1. Professor navigates to Course Analytics page
2. Selects a course from dropdown
3. Views summary statistics and charts
4. Clicks "Generate Report" button in the AI Course Report section
5. System:
   - Fetches all test results and enrollment data
   - Analyzes performance patterns
   - Generates comprehensive prompt
   - Calls Gemini 2.0 Flash API
   - Returns formatted report
6. Report appears with smooth animation
7. Professor can:
   - Read detailed insights
   - Get actionable recommendations
   - Close and regenerate as needed

## Technical Details

### AI Model Used:
- **Model**: `gemini-2.0-flash-exp`
- **API Key**: Loaded from `.env` file (`GEMINI_API_KEY`)
- **Expected Report Length**: 500-800 words
- **Format**: Professional markdown with sections and bullet points

### Error Handling:
- Returns friendly message if no test data exists
- Handles API failures gracefully
- Shows toast notifications for user feedback
- Validates professor ownership of course

### Data Sources:
- `student_enrollments` collection (proficiency levels)
- `test_results` collection (scores, topics, dates)
- `courses` collection (course metadata)

## Benefits

1. **Time-Saving**: Automated analysis instead of manual review
2. **Comprehensive**: Covers multiple dimensions (topics, proficiency, participation)
3. **Actionable**: Provides specific teaching recommendations
4. **Data-Driven**: Based on actual test performance data
5. **Professional**: Well-formatted, clear reports suitable for sharing

## Example Report Sections

The AI generates reports with:
- **Overall Performance Summary**: Class-wide trends and engagement
- **Topic Analysis**: Which topics need more attention
- **Proficiency Insights**: How students are distributed across levels
- **Recommendations**: Specific strategies for improvement
- **Strengths**: What's working well in the course

## Future Enhancements (Potential)

- Export report as PDF
- Schedule automatic reports (weekly/monthly)
- Compare reports over time
- Email reports to stakeholders
- Custom report parameters (focus areas)
