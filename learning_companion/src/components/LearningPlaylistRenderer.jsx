import React, { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MermaidDiagram from './MermaidDiagram';
import styles from './LearningPlaylistRenderer.module.css';

const DEFAULT_OPEN_STATE = {
  answer: '',
  feedback: null,
  error: null,
  isSubmitting: false,
};

const createDefaultCodingState = (initialCode = '') => ({
  code: initialCode,
  runResult: null,
  submitResult: null,
  isRunning: false,
  isSubmitting: false,
  error: null,
});

const LearningPlaylistRenderer = ({
  playlist,
  currentStepIndex,
  onStepChange,
  topicName,
  subtitle,
  renderMenuButton,
  onPlaylistComplete,
  nextSubtopicInfo,
}) => {
  // State management
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openQuestionState, setOpenQuestionState] = useState({});
  const [codingState, setCodingState] = useState({});

  // Handle both array format and object format (null-safe)
  const steps = Array.isArray(playlist) ? playlist : (playlist?.steps || []);
  const playlistTitle = Array.isArray(playlist) ? 'Learning Playlist' : (playlist?.title || 'Learning Playlist');
  const currentStep = steps[currentStepIndex];

  // Navigation handlers
  const playlistMeta = useMemo(
    () => ({
      playlistTitle,
      subtopicId: playlist?.subtopicId || null,
    }),
    [playlist, playlistTitle]
  );

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      if (typeof onStepChange === 'function') {
        onStepChange(currentStepIndex + 1);
      }
      resetAssessmentState();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      if (typeof onStepChange === 'function') {
        onStepChange(currentStepIndex - 1);
      }
      resetAssessmentState();
    }
  };

  const resetAssessmentState = () => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
  };

  const updateOpenState = (index, updater) => {
    setOpenQuestionState((prev) => {
      const prevEntry = prev[index] || { ...DEFAULT_OPEN_STATE };
      const nextEntry =
        typeof updater === 'function'
          ? updater(prevEntry)
          : { ...prevEntry, ...updater };
      return {
        ...prev,
        [index]: nextEntry,
      };
    });
  };

  const updateCodingState = (index, updater, starterCode = '') => {
    setCodingState((prev) => {
      const prevEntry =
        prev[index] || createDefaultCodingState(starterCode || '');
      const nextEntry =
        typeof updater === 'function'
          ? updater(prevEntry)
          : { ...prevEntry, ...updater };
      return {
        ...prev,
        [index]: nextEntry,
      };
    });
  };

  useEffect(() => {
    if (currentStep?.stepType === 'OpenQuestion' || currentStep?.stepType === 'openQuestion') {
      setOpenQuestionState((prev) => {
        if (prev[currentStepIndex]) {
          return prev;
        }
        return {
          ...prev,
          [currentStepIndex]: { ...DEFAULT_OPEN_STATE },
        };
      });
    }
  }, [currentStep, currentStepIndex]);

  useEffect(() => {
    if (currentStep?.stepType === 'CodingQuestion' || currentStep?.stepType === 'codingQuestion') {
      setCodingState((prev) => {
        if (prev[currentStepIndex]) {
          return prev;
        }
        // Support both old schema (displayCode) and new schema (starterCode)
        const initialCode = currentStep.content?.starterCode || currentStep.content?.displayCode || '';
        return {
          ...prev,
          [currentStepIndex]: createDefaultCodingState(initialCode),
        };
      });
    }
  }, [currentStep, currentStepIndex]);

  const postJSON = async (endpoint, payload) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      // ignore JSON parse errors for non-JSON responses
    }

    if (!response.ok) {
      throw new Error(
        data?.error || `Request to ${endpoint} failed with status ${response.status}`
      );
    }

    return data;
  };

  // Block renderer for Lesson and WorkedExample steps
  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={index} className={styles.textBlock}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {block.content}
            </ReactMarkdown>
          </div>
        );
      case 'subtitle':
        return (
          <h3 key={index} className={styles.subtitle}>
            {block.text}
          </h3>
        );
      case 'code':
        return (
          <pre key={index} className={styles.codeBlock}>
            <code>{block.content}</code>
          </pre>
        );
      case 'diagram':
        return (
          <div key={index} className={styles.diagramBlock}>
            {block.content}
          </div>
        );
      case 'mermaid':
        return (
          <div key={index} className={styles.mermaidBlock}>
            <MermaidDiagram content={block.content} className={styles.mermaidDiagram} />
          </div>
        );
      default:
        return null;
    }
  };

  // Lesson step renderer
  const renderLesson = (step) => {
    return (
      <div className={styles.lessonStep}>
        {step.content.title && (
          <h2 className={styles.stepTitle}>{step.content.title}</h2>
        )}
        <div className={styles.lessonContent}>
          {step.content.blocks.map((block, index) => renderBlock(block, index))}
        </div>
      </div>
    );
  };

  // WorkedExample step renderer (similar structure to Lesson)
  const renderWorkedExample = (step) => {
    return (
      <div className={styles.workedExampleStep}>
        {step.content.title && (
          <h2 className={styles.stepTitle}>{step.content.title}</h2>
        )}
        <div className={styles.lessonContent}>
          {step.content.blocks.map((block, index) => renderBlock(block, index))}
        </div>
      </div>
    );
  };

  // MCQ step renderer
  const renderMCQ = (step) => {
    const { question, options, correctOptionId, explanation } = step.content;

    const handleSubmit = () => {
      if (selectedAnswer) {
        setIsSubmitted(true);
      }
    };

    const isCorrect = selectedAnswer === correctOptionId;
    
    // Get feedback for selected option (new schema has per-option feedback)
    const selectedOption = options.find(opt => opt.id === selectedAnswer);
    const feedbackText = selectedOption?.feedback || explanation || '';

    return (
      <div className={styles.mcqStep}>
        <h2 className={styles.stepTitle}>Question</h2>
        <div className={styles.questionText}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{question}</ReactMarkdown>
        </div>

        <div className={styles.optionsContainer}>
          {options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const showCorrect = isSubmitted && option.id === correctOptionId;
            const showIncorrect = isSubmitted && isSelected && !isCorrect;

            return (
              <label
                key={option.id}
                className={`${styles.optionLabel} ${
                  isSelected ? styles.selected : ''
                } ${showCorrect ? styles.correct : ''} ${
                  showIncorrect ? styles.incorrect : ''
                }`}
              >
                <input
                  type="radio"
                  name="mcq-option"
                  value={option.id}
                  checked={isSelected}
                  onChange={() => setSelectedAnswer(option.id)}
                  disabled={isSubmitted}
                  className={styles.radioInput}
                />
                <span className={styles.optionText}>
                  <strong>{option.id}.</strong> {option.text}
                </span>
              </label>
            );
          })}
        </div>

        {!isSubmitted && (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className={styles.submitButton}
          >
            Submit Answer
          </button>
        )}

        {isSubmitted && (
          <div
            className={`${styles.feedbackBox} ${
              isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
            }`}
          >
            <strong>{isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong>
            <p>{feedbackText}</p>
          </div>
        )}
      </div>
    );
  };

  // Open question step renderer
  const handleOpenQuestionSubmit = async (step, stepIndex) => {
    const state = openQuestionState[stepIndex] || DEFAULT_OPEN_STATE;
    const answer = state.answer.trim();

    if (!answer) {
      return;
    }

    updateOpenState(stepIndex, (prev) => ({
      ...prev,
      isSubmitting: true,
      error: null,
    }));

    try {
      const payload = {
        question: step.content.question,
        userAnswer: answer,
        stepIndex,
        playlistTitle: playlistMeta.playlistTitle,
        subtopicId: playlistMeta.subtopicId,
      };

      const data = await postJSON('/api/open-question-feedback', payload);

      updateOpenState(stepIndex, (prev) => ({
        ...prev,
        isSubmitting: false,
        feedback: data.feedback,
      }));
    } catch (error) {
      updateOpenState(stepIndex, (prev) => ({
        ...prev,
        isSubmitting: false,
        error:
          error.message ||
          'Unable to fetch AI feedback right now. Please try again in a moment.',
      }));
    }
  };

  const renderOpenQuestion = (step, stepIndex) => {
    const { question, hint, placeholder } = step.content;
    const state = openQuestionState[stepIndex] || DEFAULT_OPEN_STATE;
    
    // Support both old schema (hint) and new schema (placeholder)
    const hintText = hint || placeholder;

    return (
      <div className={styles.openQuestionStep}>
        <h2 className={styles.stepTitle}>Question</h2>
        <div className={styles.questionText}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{question}</ReactMarkdown>
        </div>

        {hintText && <p className={styles.hintText}>💡 Hint: {hintText}</p>}

        <textarea
          className={styles.answerTextarea}
          placeholder="Type your answer here..."
          value={state.answer}
          onChange={(e) =>
            updateOpenState(stepIndex, (prev) => ({
              ...prev,
              answer: e.target.value,
            }))
          }
          rows={6}
        />

        <button
          className={styles.submitButton}
          onClick={() => handleOpenQuestionSubmit(step, stepIndex)}
          disabled={!state.answer.trim() || state.isSubmitting}
        >
          {state.isSubmitting ? 'Getting feedback...' : 'Submit Answer'}
        </button>

        {state.feedback && (
          <div className={styles.feedbackBox}>
            <strong>AI Feedback</strong>
            <p>{state.feedback}</p>
          </div>
        )}

        {state.error && <p className={styles.errorText}>{state.error}</p>}
      </div>
    );
  };

  const handleRunCode = async (step, stepIndex) => {
    // Support both old schema (displayCode) and new schema (starterCode)
    const initialCode = step.content?.starterCode || step.content?.displayCode || '';
    const state = codingState[stepIndex] || createDefaultCodingState(initialCode);
    const code = (state.code || '').trim();

    if (!code) {
      return;
    }

    updateCodingState(
      stepIndex,
      (prev) => ({
        ...prev,
        isRunning: true,
        error: null,
      }),
      initialCode
    );

    try {
      const payload = {
        code: state.code,
        language: step.content?.language || 'java',
        // Support both old (prompt) and new (markdown) field names
        prompt: step.content?.markdown || step.content?.prompt,
        // Support both old (solution) and new (solutionCode) field names
        solution: step.content?.solutionCode || step.content?.solution,
        wrapperPrefix: step.content?.wrapperPrefix || '',
        wrapperSuffix: step.content?.wrapperSuffix || '',
        // Include testCases for new schema
        testCases: step.content?.testCases || [],
        stepIndex,
        playlistTitle: playlistMeta.playlistTitle,
      };

      const data = await postJSON('/api/run-code', payload);

      updateCodingState(
        stepIndex,
        (prev) => ({
          ...prev,
          isRunning: false,
          runResult: data,
        }),
        initialCode
      );
    } catch (error) {
      updateCodingState(
        stepIndex,
        (prev) => ({
          ...prev,
          isRunning: false,
          error:
            error.message || 'Unable to run the code right now. Please try again.',
        }),
        initialCode
      );
    }
  };

  const handleSubmitCode = async (step, stepIndex) => {
    // Support both old schema (displayCode) and new schema (starterCode)
    const initialCode = step.content?.starterCode || step.content?.displayCode || '';
    const state = codingState[stepIndex] || createDefaultCodingState(initialCode);
    const code = (state.code || '').trim();

    if (!code) {
      return;
    }

    updateCodingState(
      stepIndex,
      (prev) => ({
        ...prev,
        isSubmitting: true,
        error: null,
      }),
      initialCode
    );

    try {
      const payload = {
        code: state.code,
        language: step.content?.language || 'java',
        // Support both old (prompt) and new (markdown) field names
        prompt: step.content?.markdown || step.content?.prompt,
        // Support both old (solution) and new (solutionCode) field names
        solution: step.content?.solutionCode || step.content?.solution,
        wrapperPrefix: step.content?.wrapperPrefix || '',
        wrapperSuffix: step.content?.wrapperSuffix || '',
        // Support both old (expectedOutput) and new (testCases) schemas
        expectedOutput: step.content?.expectedOutput,
        testCases: step.content?.testCases || [],
        stepIndex,
        playlistTitle: playlistMeta.playlistTitle,
      };

      const data = await postJSON('/api/submit-code', payload);

      updateCodingState(
        stepIndex,
        (prev) => ({
          ...prev,
          isSubmitting: false,
          submitResult: data,
        }),
        initialCode
      );
    } catch (error) {
      updateCodingState(
        stepIndex,
        (prev) => ({
          ...prev,
          isSubmitting: false,
          error:
            error.message ||
            'Unable to submit code at the moment. Please try again shortly.',
        }),
        initialCode
      );
    }
  };

  const handleResetCode = (step, stepIndex) => {
    // Support both old schema (displayCode) and new schema (starterCode)
    const initialCode = step.content?.starterCode || step.content?.displayCode || '';
    updateCodingState(
      stepIndex,
      () => createDefaultCodingState(initialCode),
      initialCode
    );
  };

  const renderCodingQuestion = (step, stepIndex) => {
    // Support both old schema (displayCode) and new schema (starterCode)
    const starterCode = step.content?.starterCode || step.content?.displayCode || '';
    const state =
      codingState[stepIndex] || createDefaultCodingState(starterCode);
    const { code, runResult, submitResult, isRunning, isSubmitting, error } = state;
    
    // Support both old (prompt) and new (title + markdown) field names
    const title = step.content?.title || 'Coding Exercise';
    const instructions = step.content?.markdown || step.content?.prompt || '';

    return (
      <div className={styles.codingQuestionStep}>
        <h2 className={styles.stepTitle}>{title}</h2>
        <div className={styles.questionText}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{instructions}</ReactMarkdown>
        </div>

        <CodeMirror
          value={code}
          height="340px"
          className={styles.codeEditor}
          theme={oneDark}
          extensions={[java()]}
          onChange={(value) =>
            updateCodingState(
              stepIndex,
              (prev) => ({
                ...prev,
                code: value,
              }),
              starterCode
            )
          }
        />

        <div className={styles.codeButtonsRow}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => handleResetCode(step, stepIndex)}
          >
            Reset to Starter Code
          </button>

          <div className={styles.codePrimaryButtons}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => handleRunCode(step, stepIndex)}
              disabled={!code.trim() || isRunning}
            >
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
            <button
              type="button"
              className={styles.submitButton}
              onClick={() => handleSubmitCode(step, stepIndex)}
              disabled={!code.trim() || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Code'}
            </button>
          </div>
        </div>

        {runResult && (
          <div className={styles.codeOutputBox}>
            <strong>Program Output</strong>
            {runResult.stdout && (
              <pre className={styles.codeOutputPre}>{runResult.stdout}</pre>
            )}
            {runResult.stderr && (
              <>
                <strong>Errors</strong>
                <pre className={styles.codeOutputPre}>{runResult.stderr}</pre>
              </>
            )}
            {runResult.compileOutput && (
              <>
                <strong>Compiler Output</strong>
                <pre className={styles.codeOutputPre}>{runResult.compileOutput}</pre>
              </>
            )}
          </div>
        )}

        {submitResult && (
          <div
            className={`${styles.feedbackBox} ${
              submitResult.passed
                ? styles.feedbackCorrect
                : styles.feedbackIncorrect
            }`}
          >
            <strong>
              {submitResult.passed ? '✓ All tests passed!' : 'Needs improvement'}
            </strong>
            <p>{submitResult.feedback}</p>
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}
      </div>
    );
  };

  // Main step renderer
  const renderStep = () => {
    if (!currentStep) {
      return <p className={styles.placeholder}>No step to display.</p>;
    }

    switch (currentStep.stepType) {
      case 'Lesson':
      case 'lesson':
        return renderLesson(currentStep);
      case 'MCQ':
      case 'mcq':
        return renderMCQ(currentStep);
      case 'OpenQuestion':
      case 'openQuestion':
        return renderOpenQuestion(currentStep, currentStepIndex);
      case 'CodingQuestion':
      case 'codingQuestion':
        return renderCodingQuestion(currentStep, currentStepIndex);
      case 'workedExample':
        return renderWorkedExample(currentStep);
      default:
        return <p className={styles.placeholder}>Unknown step type: {currentStep.stepType}</p>;
    }
  };

  // Show loading state if playlist hasn't loaded yet
  if (!playlist) {
    return (
      <div className={styles.playlistRenderer}>
        <div className={styles.loading}>Loading playlist...</div>
      </div>
    );
  }

  return (
    <div className={styles.playlistRenderer}>
      <div className={styles.playlistHeader}>
        {renderMenuButton && (
          <div className={styles.menuButtonWrapper}>{renderMenuButton()}</div>
        )}
        <div className={styles.headerText}>
          <h2 className={styles.playlistTitle}>{topicName || playlistTitle}</h2>
          {subtitle && <p className={styles.playlistSubtitle}>{subtitle}</p>}
        </div>
      </div>

      <div className={styles.stepContainer}>{renderStep()}</div>

      <div className={styles.navigationButtons}>
        <button
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className={styles.navButton}
        >
          ← Back
        </button>
        {currentStepIndex < steps.length - 1 ? (
          <button
            onClick={handleNext}
            className={styles.navButton}
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={onPlaylistComplete}
            className={styles.navButton}
          >
            {nextSubtopicInfo
              ? nextSubtopicInfo.isSameTopic
                ? 'Next Subtopic →'
                : 'Next Topic →'
              : 'Return to Course →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default LearningPlaylistRenderer;
