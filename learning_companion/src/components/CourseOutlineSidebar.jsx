import React, { useState, useEffect } from 'react';
import styles from './CourseOutlineSidebar.module.css';

const CourseOutlineSidebar = ({
  onSubtopicSelect,
  isOpen = true,
  selectedSubtopicId = null,
  onClose,
}) => {
  const [courseData, setCourseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourseOutline = async () => {
      try {
        setLoading(true);
        const response = await fetch('/course_outline.json');

        if (!response.ok) {
          throw new Error(`Failed to load course outline: ${response.statusText}`);
        }

        const data = await response.json();
        setCourseData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching course outline:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseOutline();
  }, []);

  if (loading) {
    return (
      <div className={`${styles.sidebar} sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className={styles.loading}>Loading course outline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.sidebar} sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className={styles.error}>
          <p>Error loading course outline:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.sidebar} sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Course Outline</h2>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose} aria-label="Close sidebar">
            ✕
          </button>
        )}
      </div>

      <div className={styles.outlineContainer}>
        {courseData.map((module) => (
          <details key={module.moduleId} className={styles.module}>
            <summary className={styles.moduleSummary}>
              {module.moduleName}
            </summary>

            <div className={styles.moduleContent}>
              {module.topics.map((topic) => (
                <details key={topic.topicId} className={styles.topic}>
                  <summary className={styles.topicSummary}>
                    {topic.topicName}
                  </summary>

                  <div className={styles.topicContent}>
                    {topic.subtopics.map((subtopic) => (
                      <div
                        key={subtopic.subtopicId}
                        className={`${styles.subtopic} ${
                          selectedSubtopicId === subtopic.subtopicId ? styles.active : ''
                        }`}
                        onClick={() =>
                          onSubtopicSelect &&
                          onSubtopicSelect({
                            ...subtopic,
                            topicName: topic.topicName,
                          })
                        }
                      >
                        {subtopic.subtopicName}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default CourseOutlineSidebar;
