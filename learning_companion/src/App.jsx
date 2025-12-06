import React, { useState, useEffect, useCallback } from 'react'
import CourseOutlineSidebar from './components/CourseOutlineSidebar'
import LearningPlaylistRenderer from './components/LearningPlaylistRenderer'
import RightPanel from './components/RightPanel'
import FocusTimer from './components/FocusTimer'
import './App.css'

function App() {
  const courseName = 'CS-102: Data Structures';

  // State management
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [courseOutline, setCourseOutline] = useState([]);
  const [outlineLoading, setOutlineLoading] = useState(true);
  const [outlineError, setOutlineError] = useState(null);

  // Lifted state for persistence across navigation
  const [notes, setNotes] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Right panel resizing state
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Fetch course outline on mount
  useEffect(() => {
    const fetchCourseOutline = async () => {
      try {
        setOutlineLoading(true);
        const response = await fetch('/playlists/course_outline.json');

        if (!response.ok) {
          throw new Error(`Failed to load course outline: ${response.statusText}`);
        }

        const data = await response.json();
        setCourseOutline(data);
        setOutlineError(null);
      } catch (err) {
        setOutlineError(err.message);
        console.error('Error fetching course outline:', err);
      } finally {
        setOutlineLoading(false);
      }
    };

    fetchCourseOutline();
  }, []);

  // Right panel resize handlers
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    // Clamp between min and max widths
    const clampedWidth = Math.min(Math.max(newWidth, 200), 800);
    setRightPanelWidth(clampedWidth);
  }, [isResizing]);

  // Bind global mouse events for resizing
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Utility: Find the next subtopic in sequence
  const getNextSubtopicInfo = (outline, currentSubtopicId) => {
    if (!outline || !currentSubtopicId) return null;

    // Flatten all subtopics with their topic info
    const allSubtopics = [];
    for (const module of outline) {
      for (const topic of module.topics) {
        for (const subtopic of topic.subtopics) {
          allSubtopics.push({
            ...subtopic,
            topicId: topic.topicId,
            topicName: topic.topicName,
          });
        }
      }
    }

    // Find current index
    const currentIndex = allSubtopics.findIndex(
      (s) => s.subtopicId === currentSubtopicId
    );

    if (currentIndex === -1 || currentIndex === allSubtopics.length - 1) {
      return null; // Not found or last subtopic
    }

    const current = allSubtopics[currentIndex];
    const next = allSubtopics[currentIndex + 1];

    return {
      subtopic: next,
      isSameTopic: current.topicId === next.topicId,
    };
  };

  // Logic functions
  const handleSubtopicSelect = async (subtopic) => {
    // Set the selected subtopic
    setSelectedSubtopic(subtopic);
    // Reset step index when switching subtopics
    setCurrentStepIndex(0);

    // Auto-collapse sidebar when entering focus mode
    setIsSidebarOpen(false);

    // Reset current playlist while loading
    setCurrentPlaylist(null);

    // Fetch the playlist JSON for this topic (playlists are grouped by topicId)
    try {
      const response = await fetch(`/playlists/${subtopic.topicId}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load playlist: ${response.statusText}`);
      }

      const topicPlaylistData = await response.json();
      
      // Extract the specific subtopic's steps from the topic-level JSON
      const subtopicSteps = topicPlaylistData[subtopic.subtopicId];
      
      if (!subtopicSteps || !Array.isArray(subtopicSteps)) {
        throw new Error(`Subtopic "${subtopic.subtopicId}" not found in playlist`);
      }

      const normalizedPlaylist = {
        title: subtopic.subtopicName || 'Learning Playlist',
        steps: subtopicSteps,
        subtopicId: subtopic.subtopicId,
        topicId: subtopic.topicId,
      };

      setCurrentPlaylist(normalizedPlaylist);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      // You might want to set an error state here
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const renderMenuButton =
    selectedSubtopic &&
    (() => (
      <button className="hamburger-btn" onClick={toggleSidebar}>
        ☰ Menu
      </button>
    ));

  // Determine app mode
  const appMode = selectedSubtopic === null ? 'browse-mode' : 'focus-mode';
  const totalSteps = currentPlaylist?.steps?.length || 0;
  const currentStep =
    currentPlaylist && Array.isArray(currentPlaylist.steps)
      ? currentPlaylist.steps[currentStepIndex] || null
      : null;

  // Compute next subtopic info for playlist completion
  const nextSubtopicInfo = getNextSubtopicInfo(
    courseOutline,
    selectedSubtopic?.subtopicId
  );

  // Handle playlist completion - navigate to next subtopic or return to browse
  const handlePlaylistComplete = () => {
    if (nextSubtopicInfo) {
      handleSubtopicSelect(nextSubtopicInfo.subtopic);
    } else {
      // No more subtopics - return to browse mode
      setSelectedSubtopic(null);
      setCurrentPlaylist(null);
      setCurrentStepIndex(0);
      setIsSidebarOpen(true);
    }
  };

  return (
    <div className={`app-container ${appMode}`}>
      {/* Hamburger Button - only visible in Focus Mode */}

      {/* Floating Focus Timer - persists across all modes */}
      <FocusTimer />

      {/* Sidebar - always rendered, CSS controls visibility */}
      <CourseOutlineSidebar
        isOpen={isSidebarOpen}
        onSubtopicSelect={handleSubtopicSelect}
        selectedSubtopicId={selectedSubtopic?.subtopicId}
        onClose={() => setIsSidebarOpen(false)}
        courseData={courseOutline}
        loading={outlineLoading}
        error={outlineError}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {selectedSubtopic === null ? (
          // Browse Mode Content
          <div className="browse-placeholder">
            <h1>Welcome</h1>
            <p>Your personalized learning companion for {courseName}</p>
            <div className="placeholder-message">
              <p>Select a subtopic from the sidebar to begin learning</p>
            </div>
          </div>
        ) : (
          // Focus Mode Content
          <>
            <div className="playlist-container">
              <LearningPlaylistRenderer
                playlist={currentPlaylist}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
                topicName={selectedSubtopic?.topicName}
                subtitle={currentPlaylist?.title}
                renderMenuButton={renderMenuButton}
                onPlaylistComplete={handlePlaylistComplete}
                nextSubtopicInfo={nextSubtopicInfo}
              />
            </div>
            <div
              className="resize-handle"
              onMouseDown={startResizing}
            />
            <div
              className="chat-pod-placeholder"
              style={{ width: rightPanelWidth }}
            >
              <RightPanel
                courseName={courseName}
                subtopic={selectedSubtopic}
                playlistTitle={currentPlaylist?.title}
                currentStep={currentStep}
                currentStepIndex={currentStepIndex}
                totalSteps={totalSteps}
                notes={notes}
                setNotes={setNotes}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
