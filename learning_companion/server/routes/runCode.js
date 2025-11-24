const express = require('express');
const router = express.Router();
const { runCode, JAVA_LANGUAGE_ID } = require('../services/judge0Client');

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

router.post('/', async (req, res, next) => {
  try {
    const {
      code,
      language = 'java',
      stdin = '',
      wrapperPrefix = '',
      wrapperSuffix = '',
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

    const sourceCode = buildSource({ code, wrapperPrefix, wrapperSuffix });

    const executionResult = await runCode({
      sourceCode,
      languageId,
      stdin,
    });

    res.json({
      stdout: executionResult.stdout,
      stderr: executionResult.stderr,
      compileOutput: executionResult.compileOutput,
      exitCode: executionResult.exitCode,
      status: executionResult.status,
      time: executionResult.time,
      memory: executionResult.memory,
      token: executionResult.token,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

