const express = require('express');
const cors = require('cors');
const config = require('./config');
const runCodeRouter = require('./routes/runCode');
const openQuestionRouter = require('./routes/openQuestion');
const submitCodeRouter = require('./routes/submitCode');
const chatRouter = require('./routes/chat');

const app = express();

app.use(cors());
app.use(
  express.json({
    limit: '1mb',
  })
);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/run-code', runCodeRouter);
app.use('/api/open-question-feedback', openQuestionRouter);
app.use('/api/submit-code', submitCodeRouter);
app.use('/api/chat', chatRouter);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
});

app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const server = app.listen(config.port, () => {
  console.log(`[server] Listening on port ${config.port}`);
});

function shutdown() {
  console.log('[server] Shutting down gracefully...');
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;

