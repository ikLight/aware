import React, { useState } from 'react';
import { useFocusTimer } from '../hooks/useFocusTimer';
import './FocusTimer.css';

/**
 * Floating Focus Timer widget with Pomodoro countdown and overtime tracking.
 * Positioned fixed in the bottom-right corner of the viewport.
 */
function FocusTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('25');

  const {
    timeDisplay,
    duration,
    isActive,
    hasStarted,
    mode,
    toggle,
    reset,
    updateDuration,
  } = useFocusTimer(25);

  // Handle duration input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    // Only allow positive numbers
    if (value === '' || /^\d+$/.test(value)) {
      setInputValue(value);
    }
  };

  // Handle input blur - commit the value
  const handleInputBlur = () => {
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue > 0) {
      updateDuration(numValue);
    } else {
      // Reset to current duration if invalid
      setInputValue(String(duration));
    }
  };

  // Handle Enter key in input
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // Get status dot color class based on mode
  const getStatusClass = () => {
    switch (mode) {
      case 'active':
        return 'status-active';
      case 'overtime':
        return 'status-overtime';
      case 'paused':
      case 'setup':
      default:
        return 'status-idle';
    }
  };

  // Chevron icons
  const ChevronUp = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  );

  const ChevronDown = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );

  // Play/Pause icons
  const PlayIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );

  const PauseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  );

  // Reset icon
  const ResetIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
      <path d="M3 3v5h5"></path>
    </svg>
  );

  return (
    <div className={`focus-timer ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {!isExpanded ? (
        // Collapsed Pill View
        <button
          className="timer-pill"
          onClick={() => setIsExpanded(true)}
          aria-label="Expand focus timer"
        >
          <span className={`status-dot ${getStatusClass()}`}></span>
          <span className="timer-display">{timeDisplay}</span>
          <span className="expand-icon">
            <ChevronUp />
          </span>
        </button>
      ) : (
        // Expanded Card View
        <div className="timer-card">
          <div className="timer-header">
            <h3 className="timer-title">Focus Timer</h3>
            <button
              className="collapse-btn"
              onClick={() => setIsExpanded(false)}
              aria-label="Collapse focus timer"
            >
              <ChevronDown />
            </button>
          </div>

          <div className="timer-body">
            <div className={`timer-display-large ${getStatusClass()}`}>
              <span className={`status-dot-large ${getStatusClass()}`}></span>
              {timeDisplay}
            </div>

            {!hasStarted && (
              <div className="duration-input-wrapper">
                <label htmlFor="timer-duration">Duration (min)</label>
                <input
                  id="timer-duration"
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  className="duration-input"
                  min="1"
                  max="180"
                />
              </div>
            )}

            <div className="timer-controls">
              <button
                className={`control-btn primary ${isActive ? 'pause' : 'play'}`}
                onClick={toggle}
                aria-label={isActive ? 'Pause timer' : 'Start timer'}
              >
                {isActive ? <PauseIcon /> : <PlayIcon />}
                <span>{isActive ? 'Pause' : hasStarted ? 'Resume' : 'Start'}</span>
              </button>
              <button
                className="control-btn secondary"
                onClick={() => {
                  reset();
                  setInputValue(String(duration));
                }}
                aria-label="Reset timer"
              >
                <ResetIcon />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FocusTimer;

