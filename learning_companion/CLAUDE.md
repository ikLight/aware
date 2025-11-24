# Learning Companion: Single-User Prototype Context

## 1. Core Mission
- **What We Are Building:** A personalized, single-user learning app for a Data Structures course.
- **The "Engine & Content" Model:**
    - The **"Engine"** (this React project) is the app shell and UI.
    - The **"Content"** is a single, large `course.json` file that the app will load to display the curriculum.
- **The "Single-User" Rule:** This is a prototype. **There is no login system or user authentication.** All data saved (notes, chat) is for this one, single user.

## 2. Tech Stack & Architecture
- **Frontend:** React (v18+) using **Vite**.
- **Backend:** Firebase (Backend-as-a-Service). We are **NOT** building a custom backend server.
- **Core Services:**
    - **Firestore (Database):** To save notes and chat history.
    - **Firebase Auth:** **NOT USED.**
- **External APIs:**
    - **Gemini API:** For the "Doubt Chat" pod.
    - **3rd-Party Code Runner (e.g., JDoodle):** For "CodingQuestion" steps.

## 3. Coding Standards & Rules
- **Rule 1 (CRITICAL):** **ALWAYS** write React code using **functional components with Hooks** (like `useState`, `useEffect`). **NEVER** use old `class` components.
- **Rule 2 (CRITICAL):** **ALWAYS** use the **Firebase v9+ modular syntax** (e.g., `getFirestore()`, `doc()`, `setDoc()`). **NEVER** use the older "namespaced" syntax.
- **Rule 3 (Security):** **NEVER** hardcode API keys or Firebase config. **ALWAYS** use Vite's environment variables (e.g., `import.meta.env.VITE_API_KEY`).
- **Rule 4 (State):** **ONLY** use built-in React Hooks (`useState`, `useContext`) for state management. **DO NOT** install or use Redux, Zustand, or any 3rd-party state managers.
- **Rule 5 (Testing):** All new components must have a corresponding test file using **Jest** and **React Testing Library**.

## 4. Key Files & Commands
- **Firebase Config:** `src/firebaseConfig.js`
- **Firestore Rules:** `firestore.rules` (See database plan below)
- **Run Dev Server:** `npm run dev`
- **Run Tests:** `npm run test`

## 5. Firestore Database Plan
This is the complete plan for our database. All data belongs to the single prototype user.

### Firestore Rules
File: `firestore.rules`

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all access for this single-user prototype
    match /{document=**} {
      allow read, write: if true;
    }
  }
}


### Data Models
When I ask you to save or load data, **ALWAYS** use these structures.

**1. Contextual Notes**
- **Collection:** `notes`
- **Document ID:** The `subtopicId` (e.g., "recursion-base-case")
- **Data Structure:**

{
  "content": "<p>This is my rich text note...</p>",
  "lastUpdated": "2025-11-16T17:39:05Z"
}


**2. Doubt Chat History**
- **Collection:** `chatHistory`
- **Document ID:** The `subtopicId` (e.g., "recursion-base-case")
- **Data Structure:**

{
  "messages": [
    { "role": "user", "content": "I don't get this." },
    { "role": "model", "content": "No problem! Let's start with..." }
  ]
}
