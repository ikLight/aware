import React, { useEffect, useRef, useState } from 'react';
import './ChatPod.css';

const buildStepSummary = (step) => {
  if (!step || !step.content) {
    return {
      stepType: step?.stepType,
      title: '',
      summaryText: '',
    };
  }

  const { stepType, content } = step;
  let title = '';
  let summaryText = '';

  if (stepType === 'Lesson') {
    title = content.title || 'Lesson';
    const blocks = Array.isArray(content.blocks) ? content.blocks : [];
    const textBlocks = blocks
      .filter((b) => b.type === 'text' && typeof b.content === 'string')
      .map((b) => b.content)
      .join('\n\n');
    summaryText = textBlocks ? textBlocks.slice(0, 500) : '';
  } else if (stepType === 'MCQ') {
    title = content.title || 'Multiple-choice Question';
    summaryText = content.question || '';
  } else if (stepType === 'OpenQuestion') {
    title = content.title || 'Open Question';
    summaryText = [content.question, content.hint ? `Hint: ${content.hint}` : null]
      .filter(Boolean)
      .join('\n\n');
  } else if (stepType === 'CodingQuestion') {
    title = content.title || 'Coding Exercise';
    const starter = content.starterCode || '';
    const starterSnippet = starter ? starter.slice(0, 400) : '';
    summaryText = [
      content.prompt || '',
      starterSnippet ? 'Starter code (truncated):\n' + starterSnippet : null,
    ]
      .filter(Boolean)
      .join('\n\n');
  } else {
    title = content.title || 'Step';
  }

  return {
    stepType,
    title,
    summaryText,
  };
};

const ChatPod = ({
  courseName,
  subtopic,
  playlistTitle,
  currentStep,
  currentStepIndex,
  totalSteps,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(scrollToBottom, [messages]);

  const buildContextPayload = () => {
    const stepContext = currentStep ? buildStepSummary(currentStep) : {};

    return {
      course: {
        name: courseName,
      },
      subtopic: subtopic
        ? {
            id: subtopic.subtopicId,
            title: subtopic.title,
          }
        : undefined,
      playlist: {
        title: playlistTitle,
        currentStepIndex:
          typeof currentStepIndex === 'number' ? currentStepIndex : undefined,
        totalSteps: typeof totalSteps === 'number' ? totalSteps : undefined,
      },
      step: stepContext,
    };
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage = { sender: 'user', text: trimmed };
    const historyPayload = messages;

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          context: buildContextPayload(),
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (error) {
        // ignore JSON parse errors for non-JSON responses
      }

      if (!response.ok || !data || typeof data.reply !== 'string') {
        throw new Error(
          data?.error || `Chat request failed with status ${response.status}`
        );
      }

      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: data.reply },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text:
            "Sorry, I'm having trouble answering right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const disabled = isLoading;

  return (
    <div className="chat-pod">
      <div className="chat-pod-header">
        <h3 className="chat-pod-title">Doubt Chat</h3>
        <p className="chat-pod-subtitle">
          Ask questions about this step or the surrounding topic.
        </p>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.sender === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="chat-bubble">{msg.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message assistant typing">
            <div className="chat-bubble">Thinking…</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a doubt about this step..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          type="button"
          className="chat-send-button"
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPod;


