import React from 'react';
import './NotesPod.css';

const NotesPod = ({ notes, setNotes }) => {
  const handleDownload = () => {
    if (!notes.trim()) {
      return;
    }

    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="notes-pod">
      <div className="notes-pod-header">
        <div className="notes-pod-title-row">
          <h3 className="notes-pod-title">Notes</h3>
          <button
            type="button"
            className="notes-download-button"
            onClick={handleDownload}
            disabled={!notes.trim()}
            title="Download notes"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        </div>
        <p className="notes-pod-subtitle">
          Jot down your thoughts as you learn.
        </p>
      </div>

      <textarea
        className="notes-textarea"
        placeholder="Type or paste your notes here..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </div>
  );
};

export default NotesPod;
