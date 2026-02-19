import React, { useState, useRef, useEffect } from 'react';
import './FeedbackWidget.css';

const MAX_LENGTH = 2000;
const TOAST_DURATION_MS = 4000;

export function FeedbackToast({ message, variant = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`feedback-toast feedback-toast-${variant}`} role="status">
      {message}
    </div>
  );
}

function FeedbackWidget({
  context = {},
  onSendFeedback,
  isOpen: controlledOpen,
  onOpenChange
}) {
  const [message, setMessage] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);
  const backdropRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : panelOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setPanelOpen;

  const showToast = (msg, variant = 'success') => {
    setToast({ message: msg, variant });
  };

  const handleClose = () => {
    setOpen(false);
    setMessage('');
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) handleClose();
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message?.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await onSendFeedback({
        message: trimmed,
        includeContext: !!includeContext,
        ...(includeContext ? context : {})
      });
      showToast('Thanks. We read every message.', 'success');
      handleClose();
    } catch (err) {
      const message = err?.message || 'Could not send feedback. Please try again.';
      showToast(message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="feedback-widget-pill"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
      >
        Feedback
      </button>

      {open && (
        <div
          ref={backdropRef}
          className="feedback-widget-backdrop"
          onClick={handleBackdropClick}
          aria-hidden
        >
          <div
            ref={panelRef}
            className="feedback-widget-panel"
            role="dialog"
            aria-labelledby="feedback-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="feedback-title" className="feedback-widget-title">Send Feedback</h2>
            <form onSubmit={handleSubmit}>
              <textarea
                className="feedback-widget-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="What’s on your mind?"
                rows={4}
                required
                maxLength={MAX_LENGTH}
                disabled={sending}
              />
              <div className="feedback-widget-meta">
                <label className="feedback-widget-checkbox">
                  <input
                    type="checkbox"
                    checked={includeContext}
                    onChange={(e) => setIncludeContext(e.target.checked)}
                    disabled={sending}
                  />
                  <span>Include page context</span>
                </label>
                <span className="feedback-widget-counter">
                  {message.length} / {MAX_LENGTH}
                </span>
              </div>
              <div className="feedback-widget-actions">
                <button type="button" className="feedback-widget-btn secondary" onClick={handleClose} disabled={sending}>
                  Cancel
                </button>
                <button type="submit" className="feedback-widget-btn primary" disabled={sending || !message.trim()}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <FeedbackToast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

export default FeedbackWidget;
