const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  env: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  judge0: {
    apiKey: process.env.JUDGE0_RAPIDAPI_KEY || '',
    host: process.env.JUDGE0_RAPIDAPI_HOST || '',
    baseUrl: process.env.JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com',
  },
};

function validateRequiredEnv() {
  const missing = [];

  if (!config.geminiApiKey) {
    missing.push('GEMINI_API_KEY');
  }

  if (!config.judge0.apiKey) {
    missing.push('JUDGE0_RAPIDAPI_KEY');
  }

  if (!config.judge0.host) {
    missing.push('JUDGE0_RAPIDAPI_HOST');
  }

  if (missing.length && config.env === 'development') {
    console.warn(
      `[config] Missing environment variables: ${missing.join(
        ', '
      )}. Some features may not work until these are provided.`
    );
  } else if (missing.length) {
    throw new Error(
      `[config] Required environment variables missing in production: ${missing.join(
        ', '
      )}`
    );
  }
}

validateRequiredEnv();

module.exports = config;

