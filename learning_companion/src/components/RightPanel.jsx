import React, { useState } from 'react';
import ChatPod from './ChatPod';
import NotesPod from './NotesPod';
import './RightPanel.css';

const RightPanel = ({
  courseName,
  subtopic,
  playlistTitle,
  currentStep,
  currentStepIndex,
  totalSteps,
  notes,
  setNotes,
  chatHistory,
  setChatHistory,
}) => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="right-panel">
      <div className="right-panel-tabs">
        <button
          type="button"
          className={`right-panel-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          title="Doubt Chat"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="right-panel-tab-label">Chat</span>
        </button>

        <button
          type="button"
          className={`right-panel-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
          title="Notes"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="right-panel-tab-label">Notes</span>
        </button>
      </div>

      <div className="right-panel-content">
        <div className={`right-panel-pane ${activeTab === 'chat' ? 'active' : ''}`}>
          <ChatPod
            courseName={courseName}
            subtopic={subtopic}
            playlistTitle={playlistTitle}
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            messages={chatHistory}
            setMessages={setChatHistory}
          />
        </div>
        <div className={`right-panel-pane ${activeTab === 'notes' ? 'active' : ''}`}>
          <NotesPod notes={notes} setNotes={setNotes} />
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
