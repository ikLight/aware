const axios = require('axios');
const config = require('../config');

const JAVA_LANGUAGE_ID = 62; // Judge0: Java (OpenJDK)

const http = axios.create({
  baseURL: config.judge0.baseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'x-rapidapi-key': config.judge0.apiKey,
    'x-rapidapi-host': config.judge0.host,
  },
});

function ensureCredentials() {
  if (!config.judge0.apiKey || !config.judge0.host) {
    throw new Error(
      'Judge0 credentials are not configured. Please set JUDGE0_RAPIDAPI_KEY and JUDGE0_RAPIDAPI_HOST.'
    );
  }
}

async function runCode({
  sourceCode,
  languageId = JAVA_LANGUAGE_ID,
  stdin = '',
  cpuTimeLimit = 5,
  memoryLimit = 128000,
}) {
  ensureCredentials();

  const params = new URLSearchParams({
    base64_encoded: 'false',
    wait: 'true',
    fields: 'stdout,stderr,status,compile_output,time,memory,exit_code,token',
  });

  const payload = {
    source_code: sourceCode,
    language_id: languageId,
    stdin,
    cpu_time_limit: cpuTimeLimit,
    memory_limit: memoryLimit,
  };

  const response = await http.post(`/submissions?${params.toString()}`, payload);

  return normalizeResponse(response.data);
}

function normalizeResponse(data) {
  return {
    stdout: data.stdout,
    stderr: data.stderr,
    compileOutput: data.compile_output,
    exitCode: data.exit_code,
    status: data.status,
    time: data.time,
    memory: data.memory,
    token: data.token,
  };
}

module.exports = {
  runCode,
  JAVA_LANGUAGE_ID,
};

