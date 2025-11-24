# Learning Companion

This project renders structured learning playlists for CS-102. Lessons, MCQs, open-response reflections, and coding labs are all handled inside a single React application. A lightweight Node server handles AI feedback (Gemini 3) and code execution (Judge0 CE).

## Project structure

```
learning_companion/
├── src/                    # React app
├── public/                 # Playlist JSON files
├── server/                 # Node + Express API (AI + Judge0)
└── vite.config.js          # Vite dev server config + proxy
```

## Frontend (React + Vite)

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:4000`, so start the backend first or in parallel.

## Backend (Node + Express)

```bash
cd server
npm install
cp env.example .env   # fill in Gemini + Judge0 credentials
npm run dev           # or npm start for production mode
```

Routes:

- `POST /api/open-question-feedback` – sends open responses to Gemini for formative feedback.
- `POST /api/run-code` – proxies code execution requests to Judge0 CE.
- `POST /api/submit-code` – runs grading harnesses and asks Gemini for coaching feedback.
- `GET /health` – simple status check.

## Environment variables

Backend `.env` (see `server/env.example`):

```
PORT=4000
GEMINI_API_KEY=...
JUDGE0_RAPIDAPI_KEY=...
JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
```

Never expose these keys to the frontend; they are consumed only by the Node server.
