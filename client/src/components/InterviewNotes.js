import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlus, FaTrash, FaEdit, FaLink, FaTimes } from 'react-icons/fa';
import api from '../services/supabaseApi';
import './InterviewNotes.css';

function InterviewNotes({ currentUser, outcomes, selectedNoteId, onNoteSelected, onLinkCreated }) {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedText, setSelectedText] = useState(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [availableNodes, setAvailableNodes] = useState([]);
  const textAreaRef = useRef(null);

  const loadNotes = async () => {
    try {
      const data = await api.getInterviewNotes();
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      alert('Failed to load interview notes. Please check if the server is running.');
      setNotes([]);
    }
  };

  const extractNodes = useCallback(() => {
    const nodes = [];
    if (!outcomes || outcomes.length === 0) {
      setAvailableNodes([]);
      return;
    }
    outcomes.forEach(outcome => {
      nodes.push({ id: outcome.id, type: 'outcome', title: outcome.title, path: `Outcome: ${outcome.title}` });
      outcome.opportunities?.forEach(opp => {
        nodes.push({ id: opp.id, type: 'opportunity', title: opp.title, path: `Outcome: ${outcome.title} > Opportunity: ${opp.title}` });
        opp.solutions?.forEach(sol => {
          nodes.push({ id: sol.id, type: 'solution', title: sol.title, path: `Outcome: ${outcome.title} > Opportunity: ${opp.title} > Solution: ${sol.title}` });
          sol.tests?.forEach(test => {
            nodes.push({ id: test.id, type: 'test', title: test.title, path: `Outcome: ${outcome.title} > Opportunity: ${opp.title} > Solution: ${sol.title} > Test: ${test.title}` });
          });
        });
      });
    });
    setAvailableNodes(nodes);
  }, [outcomes]);

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    extractNodes();
  }, [extractNodes]);

  useEffect(() => {
    if (selectedNoteId && notes.length > 0) {
      const note = notes.find(n => n.id === selectedNoteId);
      if (note && (!selectedNote || selectedNote.id !== note.id)) {
        setSelectedNote(note);
        setIsEditing(false);
      }
    }
  }, [selectedNoteId, notes, selectedNote]);

  const handleTextSelection = () => {
    const textarea = textAreaRef.current;
    if (!textarea || !isEditing) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);

    if (selected.trim().length > 0 && selected.trim().length < 500) {
      setSelectedText({
        text: selected.trim(),
        start,
        end
      });
      setShowLinkDialog(true);
    }
  };

  const handleManualLink = () => {
    handleTextSelection();
    if (!selectedText) {
      alert('Please select some text first by highlighting it in the editor.');
    }
  };

  const handleCreateNote = async () => {
    if (!currentUser || !currentUser.name) {
      alert('Please make sure you are logged in');
      return;
    }
    try {
      const newNote = await api.createInterviewNote({
        title: 'New Interview Note',
        content: '',
        author: currentUser.name
      });
      setNotes([...notes, newNote]);
      setSelectedNote(newNote);
      setIsEditing(true);
    } catch (error) {
      console.error('Error creating note:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create note';
      alert(`Failed to create note: ${errorMsg}`);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    try {
      const textarea = textAreaRef.current;
      if (!textarea) {
        alert('Cannot save: editor not found');
        return;
      }
      
      const updatedNote = await api.updateInterviewNote(selectedNote.id, {
        title: selectedNote.title || 'Untitled Note',
        content: textarea.value
      });
      setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
      setSelectedNote(updatedNote);
      setIsEditing(false);
      setSelectedText(null); // Clear any selected text
    } catch (error) {
      console.error('Error saving note:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to save note';
      alert(`Failed to save note: ${errorMsg}`);
    }
  };

  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleLinkQuote = async (entityId, entityType) => {
    if (!selectedNote || !selectedText) return;
    
    try {
      const quoteId = generateId();
      await api.addNoteLink(selectedNote.id, {
        quoteId,
        quoteText: selectedText.text,
        entityId,
        entityType
      });
      
      // Update local state
      const updatedNote = await api.getInterviewNote(selectedNote.id);
      setSelectedNote(updatedNote);
      setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
      setShowLinkDialog(false);
      setSelectedText(null);
      
      // Notify parent to refresh tree so note links appear
      if (onLinkCreated) {
        onLinkCreated();
      }
      
      // Show success message
      alert(`Quote successfully linked to OST node! The link will appear on the node in the tree view.`);
    } catch (error) {
      console.error('Error linking quote:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to link quote';
      alert(`Failed to link quote: ${errorMsg}`);
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!selectedNote) return;
    try {
      await api.deleteNoteLink(selectedNote.id, linkId);
      const updatedNote = await api.getInterviewNote(selectedNote.id);
      setSelectedNote(updatedNote);
      setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Failed to delete link');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await api.deleteInterviewNote(noteId);
        setNotes(notes.filter(n => n.id !== noteId));
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note');
      }
    }
  };

  const getLinkedQuotesForNode = (entityId, entityType) => {
    if (!selectedNote || !selectedNote.links) return [];
    return selectedNote.links.filter(link => 
      link.entityId === entityId && link.entityType === entityType
    );
  };

  const highlightLinkedQuotes = (htmlContent, links) => {
    if (!links || links.length === 0) return htmlContent;
    if (!htmlContent) return '';
    
    let highlighted = htmlContent;
    // Sort links by length (longest first) to avoid partial matches
    const sortedLinks = [...links].sort((a, b) => b.quoteText.length - a.quoteText.length);
    
    sortedLinks.forEach(link => {
      if (!link.quoteText || link.quoteText.trim().length === 0) return;
      
      // Escape HTML special characters in the quote text
      const escapedQuote = link.quoteText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      // Create regex that matches the quote text (case insensitive)
      const regex = new RegExp(`(${escapedQuote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      
      // Only replace if not already inside a mark tag
      highlighted = highlighted.replace(regex, (match, p1) => {
        // Check if already inside a mark tag
        const beforeMatch = highlighted.substring(0, highlighted.indexOf(match));
        const openMarks = (beforeMatch.match(/<mark/g) || []).length;
        const closeMarks = (beforeMatch.match(/<\/mark>/g) || []).length;
        
        if (openMarks > closeMarks) {
          return match; // Already inside a mark, don't replace
        }
        return `<mark class="linked-quote" data-link-id="${link.id}" title="Linked to OST node">${p1}</mark>`;
      });
    });
    
    return highlighted;
  };

  if (!currentUser) {
    return (
      <div className="interview-notes-container">
        <div className="no-note-selected" style={{ width: '100%', textAlign: 'center' }}>
          <p>Please log in to access interview notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-notes-container">
      <div className="notes-sidebar">
        <div className="notes-sidebar-header">
          <h2>Interview Notes</h2>
          <button onClick={handleCreateNote} className="btn-add-note">
            <FaPlus /> New Note
          </button>
        </div>
        <div className="notes-list">
          {notes.length === 0 ? (
            <div className="no-notes">No notes yet. Create your first interview note!</div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedNote(note);
                  setIsEditing(false);
                  if (onNoteSelected) {
                    onNoteSelected(note.id);
                  }
                }}
              >
                <div className="note-item-header">
                  <h3>{note.title}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    className="btn-delete-note"
                    title="Delete note"
                  >
                    <FaTrash />
                  </button>
                </div>
                <div className="note-item-meta">
                  <span>{note.author}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                {note.links && note.links.length > 0 && (
                  <div className="note-item-links">
                    {note.links.length} link{note.links.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="notes-editor">
        {selectedNote ? (
          <>
            <div className="editor-header">
              {isEditing ? (
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
                  className="note-title-input"
                  placeholder="Note title"
                />
              ) : (
                <h2>{selectedNote.title}</h2>
              )}
              <div className="editor-actions">
                {isEditing ? (
                  <>
                    <button onClick={handleSaveNote} className="btn-save">Save</button>
                    <button onClick={() => setIsEditing(false)} className="btn-cancel">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="btn-edit">
                    <FaEdit /> Edit
                  </button>
                )}
              </div>
            </div>

            <div className="editor-content">
              <div className="editor-main">
                <div className="editor-toolbar">
                  <button
                    onClick={handleManualLink}
                    className="btn-link-quote"
                    disabled={!isEditing}
                    title="Link selected text to OST node (or select text and this will appear automatically)"
                  >
                    <FaLink /> Link Selected Text
                  </button>
                  {selectedText && isEditing && (
                    <span className="selected-text-preview">
                      Selected: "{selectedText.text.substring(0, 50)}{selectedText.text.length > 50 ? '...' : ''}"
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <textarea
                    ref={textAreaRef}
                    value={selectedNote.content || ''}
                    onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                    className="notes-textarea"
                    placeholder="Write your interview notes here... Select text and the link dialog will appear automatically, or use the 'Link Selected Text' button."
                    onMouseUp={handleTextSelection}
                    onKeyUp={handleTextSelection}
                    onSelect={handleTextSelection}
                  />
                ) : (
                  <div
                    className="notes-display"
                    dangerouslySetInnerHTML={{
                      __html: highlightLinkedQuotes(
                        (selectedNote.content || '')
                          .split('\n')
                          .map(line => {
                            const escaped = line
                              .replace(/&/g, '&amp;')
                              .replace(/</g, '&lt;')
                              .replace(/>/g, '&gt;');
                            return `<p>${escaped || '<br>'}</p>`;
                          })
                          .join(''),
                        selectedNote.links || []
                      )
                    }}
                  />
                )}
              </div>

              <div className="editor-links">
                <h3>Linked to OST Nodes</h3>
                {selectedNote.links && selectedNote.links.length > 0 ? (
                  <div className="links-list">
                    {selectedNote.links.map(link => {
                      const node = availableNodes.find(n => n.id === link.entityId && n.type === link.entityType);
                      return (
                        <div key={link.id} className="link-item">
                          <div className="link-quote">
                            "{link.quoteText}"
                          </div>
                          <div className="link-target">
                            → {node ? node.path : `${link.entityType}: ${link.entityId}`}
                          </div>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="btn-delete-link"
                            title="Remove link"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-links">No links yet. Select text and click "Link Selected Text" to create links.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="no-note-selected">
            <p>Select a note from the sidebar or create a new one to get started.</p>
          </div>
        )}
      </div>

      {showLinkDialog && selectedText && (
        <div className="link-dialog-overlay" onClick={() => {
          setShowLinkDialog(false);
          setSelectedText(null);
        }}>
          <div className="link-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="link-dialog-header">
              <h3>Link Quote to OST Node</h3>
              <button onClick={() => {
                setShowLinkDialog(false);
                setSelectedText(null);
              }} className="btn-close-dialog">
                <FaTimes />
              </button>
            </div>
            <div className="link-dialog-quote">
              <strong>Selected Quote:</strong>
              <div className="quote-text">"{selectedText.text}"</div>
            </div>
            <div className="link-dialog-nodes">
              <label htmlFor="node-select">Select OST Node to link this quote to:</label>
              <select
                id="node-select"
                className="node-select"
                defaultValue=""
                onChange={(e) => {
                  const [entityType, entityId] = e.target.value.split('|');
                  if (entityId && entityType) {
                    handleLinkQuote(entityId, entityType);
                  }
                }}
              >
                <option value="">-- Select a node --</option>
                {availableNodes.length === 0 ? (
                  <option value="" disabled>No nodes available. Create some outcomes first.</option>
                ) : (
                  availableNodes.map(node => (
                    <option key={`${node.type}-${node.id}`} value={`${node.type}|${node.id}`}>
                      {node.path}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="link-dialog-actions">
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setSelectedText(null);
                }}
                className="btn-cancel-link"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewNotes;

