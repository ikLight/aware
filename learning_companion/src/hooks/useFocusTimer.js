import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing a Pomodoro-style focus timer with overtime tracking.
 * 
 * @param {number} initialDuration - Initial duration in minutes (default: 25)
 * @returns {Object} Timer state and control functions
 */
export function useFocusTimer(initialDuration = 25) {
  // Duration in minutes (user-configurable)
  const [duration, setDuration] = useState(initialDuration);
  
  // Time in seconds: positive = countdown, negative = overtime
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60);
  
  // Whether the timer is actively running
  const [isActive, setIsActive] = useState(false);
  
  // Track if timer has ever been started (to distinguish setup from paused)
  const [hasStarted, setHasStarted] = useState(false);
  
  // Ref to store interval ID
  const intervalRef = useRef(null);

  // Determine current mode based on state
  const getMode = useCallback(() => {
    if (!hasStarted) return 'setup';
    if (!isActive) return 'paused';
    if (timeLeft <= 0) return 'overtime';
    return 'active';
  }, [hasStarted, isActive, timeLeft]);

  const mode = getMode();

  // Format time for display
  const formatTime = useCallback((seconds) => {
    const isOvertime = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return isOvertime ? `+${formatted}` : formatted;
  }, []);

  const timeDisplay = formatTime(timeLeft);

  // Calculate progress (0 to 1, then beyond 1 for overtime)
  const totalSeconds = duration * 60;
  const progress = totalSeconds > 0 
    ? (totalSeconds - timeLeft) / totalSeconds 
    : 0;

  // Timer interval effect
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive]);

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
    }
    setIsActive((prev) => !prev);
  }, [hasStarted]);

  // Reset timer to current duration
  const reset = useCallback(() => {
    setIsActive(false);
    setHasStarted(false);
    setTimeLeft(duration * 60);
  }, [duration]);

  // Update duration (only allowed in setup mode)
  const updateDuration = useCallback((newMinutes) => {
    // Clamp to reasonable values (1-180 minutes)
    const clamped = Math.max(1, Math.min(180, Math.floor(newMinutes)));
    setDuration(clamped);
    if (!hasStarted) {
      setTimeLeft(clamped * 60);
    }
  }, [hasStarted]);

  return {
    // State
    timeLeft,
    timeDisplay,
    duration,
    isActive,
    hasStarted,
    mode,
    progress,
    
    // Controls
    toggle,
    reset,
    updateDuration,
  };
}

export default useFocusTimer;

