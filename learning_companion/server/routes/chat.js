const express = require('express');
const router = express.Router();
const { getChatResponse } = require('../services/geminiClient');

router.post('/', async (req, res, next) => {
  try {
    const { message, history, context } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required.',
      });
    }

    const reply = await getChatResponse({
      message,
      history: Array.isArray(history) ? history : [],
      context: context || {},
    });

    res.json({ reply });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


