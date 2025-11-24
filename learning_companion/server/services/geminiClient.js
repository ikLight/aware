const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-pro-exp-02-05';

let client = null;

if (config.geminiApiKey) {
  client = new GoogleGenerativeAI(config.geminiApiKey);
}

function ensureClient() {
  if (!client) {
    throw new Error(
      'Gemini client is not configured. Please set GEMINI_API_KEY in the backend environment.'
    );
  }
}

async function getOpenQuestionFeedback({ question, userAnswer, context = {} }) {
  ensureClient();

  const { playlistTitle, stepIndex, subtopicId } = context;

  const contextHeader = [
    playlistTitle ? `Playlist: ${playlistTitle}` : null,
    typeof stepIndex === 'number' ? `Step #: ${stepIndex}` : null,
    subtopicId ? `Subtopic ID: ${subtopicId}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const userText = [
    contextHeader || null,
    `Question:\n${question}`,
    `Student answer:\n${userAnswer}`,
    'Provide feedback in 2-3 sentences. Start by stating if the answer is correct, partially correct, or incorrect.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction:
      'You are an encouraging CS teaching assistant providing formative feedback. Be concise and actionable. Identify correctness, missing concepts, and offer one improvement suggestion.',
  });

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: userText }],
      },
    ],
  });

  const text = response.response
    ?.candidates?.[0]
    ?.content?.parts?.map((part) => part.text)
    ?.join('\n')
    ?.trim();

  if (!text) {
    throw new Error('Gemini did not return any feedback.');
  }

  return text;
}

async function getChatResponse({ message, history = [], context = {} }) {
  ensureClient();

  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction:
      'You are an expert CS tutor helping a student in an interactive learning platform. ' +
      'You are given information about the current course, subtopic, playlist, and the specific step the student is viewing. ' +
      'Use this context to answer the student\'s question helpfully and concisely. ' +
      'It is okay to answer general CS questions, but when possible, connect your explanation to the current topic. ' +
      'Avoid giving full solutions to coding questions; focus on hints and explanations.',
  });

  const { course = {}, subtopic = {}, playlist = {}, step = {} } = context || {};

  const contextLines = [];

  if (course.name) {
    contextLines.push(`COURSE: ${course.name}`);
  }

  if (subtopic.title || subtopic.id) {
    const details = [
      subtopic.title ? subtopic.title : null,
      subtopic.id ? `id: ${subtopic.id}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    contextLines.push(`SUBTOPIC: ${details}`);
  }

  if (playlist.title) {
    contextLines.push(`PLAYLIST: ${playlist.title}`);
  }

  if (
    typeof playlist.currentStepIndex === 'number' &&
    typeof playlist.totalSteps === 'number'
  ) {
    contextLines.push(
      `CURRENT STEP INDEX: ${playlist.currentStepIndex} of ${playlist.totalSteps}`
    );
  } else if (typeof playlist.currentStepIndex === 'number') {
    contextLines.push(`CURRENT STEP INDEX: ${playlist.currentStepIndex}`);
  }

  const stepLines = [];

  if (step.stepType) {
    stepLines.push(`STEP TYPE: ${step.stepType}`);
  }

  if (step.title) {
    stepLines.push(`STEP TITLE: ${step.title}`);
  }

  if (step.summaryText) {
    stepLines.push('STEP SUMMARY:');
    stepLines.push(step.summaryText);
  }

  if (stepLines.length > 0) {
    contextLines.push(stepLines.join('\n'));
  }

  const contextText = contextLines.join('\n');

  const userPrompt = [
    contextText || null,
    'STUDENT QUESTION:',
    message,
  ]
    .filter(Boolean)
    .join('\n\n');

  const trimmedHistory =
    Array.isArray(history) && history.length ? history.slice(-5) : [];

  const historyContents = trimmedHistory.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text || '' }],
  }));

  const response = await model.generateContent({
    contents: [
      ...historyContents,
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
  });

  const text = response.response
    ?.candidates?.[0]
    ?.content?.parts?.map((part) => part.text)
    ?.join('\n')
    ?.trim();

  if (!text) {
    throw new Error('Gemini did not return any chat response.');
  }

  return text;
}

async function getCodeFeedback({
  prompt,
  studentCode,
  referenceSolution,
  executionResult,
  testsSummary = {},
}) {
  ensureClient();

  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction:
      'You are an expert code reviewer for a CS course. Provide concise, actionable feedback.',
  });

  const failures =
    testsSummary.failures && testsSummary.failures.length
      ? testsSummary.failures
          .map((failure, index) => `${index + 1}. ${failure}`)
          .join('\n')
      : testsSummary.summary ||
        'No structured test results provided. Base feedback on execution output.';

  const execDetails = [
    executionResult?.status?.description
      ? `Judge0 status: ${executionResult.status.description}`
      : null,
    executionResult?.stdout ? `Stdout:\n${executionResult.stdout}` : null,
    executionResult?.stderr ? `Stderr:\n${executionResult.stderr}` : null,
    executionResult?.compileOutput
      ? `Compiler output:\n${executionResult.compileOutput}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const userPrompt = [
    prompt ? `Exercise prompt:\n${prompt}` : '',
    referenceSolution
      ? `Reference solution (keep private):\n${referenceSolution}`
      : '',
    `Student submission:\n${studentCode}`,
    `Execution details:\n${execDetails || 'No execution details available.'}`,
    `Test summary:\n${failures}`,
    'Give high-level, constructive feedback. Explain why it passes or fails and suggest concrete improvements. Avoid providing full code unless necessary.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
  });

  const text = response.response
    ?.candidates?.[0]
    ?.content?.parts?.map((part) => part.text)
    ?.join('\n')
    ?.trim();

  if (!text) {
    throw new Error('Gemini did not return any code feedback.');
  }

  return text;
}

module.exports = {
  getOpenQuestionFeedback,
  getChatResponse,
  getCodeFeedback,
};

