const express = require('express');
const router = express.Router();
const { runCode, JAVA_LANGUAGE_ID } = require('../services/judge0Client');
const { getCodeFeedback } = require('../services/geminiClient');

const LANGUAGE_ID_LOOKUP = {
  java: JAVA_LANGUAGE_ID,
};

function buildSource({ code, wrapperPrefix, wrapperSuffix }) {
  const hasWrapper =
    (wrapperPrefix && wrapperPrefix.length > 0) ||
    (wrapperSuffix && wrapperSuffix.length > 0);

  if (hasWrapper) {
    return `${wrapperPrefix || ''}${code || ''}${wrapperSuffix || ''}`;
  }

  return code;
}

const normalizeOutput = (value) =>
  (value || '').replace(/\r\n/g, '\n').trim();

function derivePassFail(status) {
  if (!status) return false;
  return status.id === 3; // Judge0 status 3 = Accepted
}

router.post('/', async (req, res, next) => {
  try {
    const {
      code,
      language = 'java',
      prompt,
      solution,
      stdin: rawStdin = '',
      testsSummary,
      wrapperPrefix = '',
      wrapperSuffix = '',
      expectedOutput: rawExpectedOutput,
      testCases = [],
    } = req.body || {};

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: 'Code is required.',
      });
    }

    const normalizedLanguage = String(language || '').toLowerCase();
    const languageId = LANGUAGE_ID_LOOKUP[normalizedLanguage];

    if (!languageId) {
      return res.status(400).json({
        error: `Unsupported language "${language}".`,
      });
    }

    // Support both old schema (expectedOutput) and new schema (testCases array)
    // For new schema, use the first test case's input/expectedOutput
    let stdin = rawStdin;
    let expectedOutput = rawExpectedOutput;
    
    if (Array.isArray(testCases) && testCases.length > 0) {
      const firstTestCase = testCases[0];
      if (firstTestCase.input !== undefined) {
        stdin = firstTestCase.input;
      }
      if (firstTestCase.expectedOutput !== undefined) {
        expectedOutput = firstTestCase.expectedOutput;
      }
    }

    const sourceCode = buildSource({ code, wrapperPrefix, wrapperSuffix });

    const executionResult = await runCode({
      sourceCode,
      languageId,
      stdin,
    });

    let passed = derivePassFail(executionResult.status);
    if (typeof expectedOutput === 'string') {
      passed =
        normalizeOutput(executionResult.stdout) ===
        normalizeOutput(expectedOutput);
    }

    let feedback = null;
    try {
      feedback = await getCodeFeedback({
        prompt,
        studentCode: code,
        referenceSolution: solution,
        executionResult,
        testsSummary: {
          expectedOutput,
          actualOutput: executionResult.stdout,
          ...testsSummary,
        },
      });
    } catch (feedbackError) {
      console.error('[Gemini] Unable to generate code feedback:', feedbackError);
    }

    res.json({
      passed,
      feedback:
        feedback ||
        (passed
          ? 'Great job! Your code compiled and ran without errors.'
          : 'Code execution failed. Review the errors above and try again.'),
      execution: {
        stdout: executionResult.stdout,
        stderr: executionResult.stderr,
        compileOutput: executionResult.compileOutput,
        exitCode: executionResult.exitCode,
        status: executionResult.status,
        time: executionResult.time,
        memory: executionResult.memory,
        token: executionResult.token,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

