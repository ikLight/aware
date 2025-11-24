const express = require('express');
const router = express.Router();
const { getOpenQuestionFeedback } = require('../services/geminiClient');

router.post('/', async (req, res, next) => {
  try {
    const { question, userAnswer, playlistTitle, stepIndex, subtopicId } =
      req.body || {};

    if (!question || !userAnswer) {
      return res.status(400).json({
        error: 'Both question and userAnswer are required.',
      });
    }

    const feedback = await getOpenQuestionFeedback({
      question,
      userAnswer,
      context: {
        playlistTitle,
        stepIndex,
        subtopicId,
      },
    });

    res.json({ feedback });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

