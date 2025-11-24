import React, { useState } from 'react'
import CourseOutlineSidebar from './components/CourseOutlineSidebar'
import LearningPlaylistRenderer from './components/LearningPlaylistRenderer'
import ChatPod from './components/ChatPod'
import './App.css'

function App() {
  const courseName = 'CS-102: Data Structures';

  // State management
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

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

    // Fetch the playlist JSON for this subtopic
    try {
      const response = await fetch(`/playlists/${subtopic.subtopicId}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load playlist: ${response.statusText}`);
      }

      const playlistData = await response.json();
      const normalizedPlaylist = Array.isArray(playlistData)
        ? {
            title: subtopic.subtopicName || 'Learning Playlist',
            steps: playlistData,
          }
        : {
            ...playlistData,
            title: playlistData.title || subtopic.subtopicName || 'Learning Playlist',
          };

      normalizedPlaylist.subtopicId = subtopic.subtopicId;

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

  return (
    <div className={`app-container ${appMode}`}>
      {/* Hamburger Button - only visible in Focus Mode */}

      {/* Sidebar - always rendered, CSS controls visibility */}
      <CourseOutlineSidebar
        isOpen={isSidebarOpen}
        onSubtopicSelect={handleSubtopicSelect}
        selectedSubtopicId={selectedSubtopic?.subtopicId}
        onClose={() => setIsSidebarOpen(false)}
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
              />
            </div>
            <div className="chat-pod-placeholder">
              <ChatPod
                courseName={courseName}
                subtopic={selectedSubtopic}
                playlistTitle={currentPlaylist?.title}
                currentStep={currentStep}
                currentStepIndex={currentStepIndex}
                totalSteps={totalSteps}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
