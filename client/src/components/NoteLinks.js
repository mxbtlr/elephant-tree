import React, { useState, useEffect, useCallback } from 'react';
import { FaStickyNote, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import api from '../services/supabaseApi';
import './NoteLinks.css';

function NoteLinks({ entityId, entityType, onNavigateToNote }) {
  const [links, setLinks] = useState([]);
  const [showLinks, setShowLinks] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadLinks = useCallback(async () => {
    if (!entityId || !entityType) {
      setLinks([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await api.getEntityNoteLinks(entityType, entityId);
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading note links:', error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  // Load links when component mounts or entity changes
  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Reload links when panel is opened to get fresh data
  useEffect(() => {
    if (showLinks) {
      loadLinks();
    }
  }, [showLinks, loadLinks]);

  return (
    <div className="note-links-container">
      <button
        className="note-links-toggle"
        onClick={() => {
          setShowLinks(!showLinks);
          if (!showLinks) {
            loadLinks(); // Refresh links when opening
          }
        }}
        title={`View linked interview notes (${links.length} link${links.length !== 1 ? 's' : ''})`}
      >
        <FaStickyNote />
        <span className="note-links-count">{links.length}</span>
      </button>

      {showLinks && (
        <div className="note-links-panel">
          <div className="note-links-header">
            <h4>Linked Interview Notes ({links.length})</h4>
            <button
              onClick={() => setShowLinks(false)}
              className="btn-close-links"
              title="Close"
            >
              <FaTimes />
            </button>
          </div>
          {loading ? (
            <div className="note-links-loading">Loading...</div>
          ) : links.length === 0 ? (
            <div className="no-note-links">No interview notes linked to this node.</div>
          ) : (
            <div className="note-links-list">
              {links.map(link => (
                <div key={link.id} className="note-link-item">
                  <div className="note-link-quote">
                    "{link.quoteText}"
                  </div>
                  <div className="note-link-source">
                    From: {link.noteTitle}
                  </div>
                  {onNavigateToNote && link.noteId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToNote(link.noteId);
                      }}
                      className="btn-view-note"
                      title="View note in Interview Notes tab"
                    >
                      <FaExternalLinkAlt /> View Note
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NoteLinks;

