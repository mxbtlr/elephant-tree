import React, { useState } from 'react';
import { FaComment, FaTrash, FaTimes } from 'react-icons/fa';
import api from '../services/supabaseApi';
import './Comments.css';

function Comments({ entityId, entityType, comments = [], currentUser, onUpdate }) {
  const [showComments, setShowComments] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    try {
      await api.addComment(entityId, entityType, {
        text: commentText,
        author: currentUser.name
      });
      setCommentText('');
      setShowAddForm(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await api.deleteComment(commentId, entityId, entityType);
        onUpdate();
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment');
      }
    }
  };

  const commentCount = comments?.length || 0;

  return (
    <div className="comments-container">
      <button 
        className="comments-toggle-btn"
        onClick={() => setShowComments(!showComments)}
        title={showComments ? 'Hide comments' : 'Show comments'}
      >
        <FaComment />
        <span className="comment-count">{commentCount}</span>
      </button>
      
      {showComments && (
        <div className="comments-panel">
          <div className="comments-header">
            <h4>Comments ({commentCount})</h4>
            <button 
              className="btn-close"
              onClick={() => setShowComments(false)}
              title="Close"
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="comments-list">
            {commentCount === 0 ? (
              <div className="no-comments">No comments yet. Be the first to comment!</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-date">
                      {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString()}
                    </span>
                    {(currentUser.name === comment.author || currentUser.name === 'Admin') && (
                      <button
                        className="btn-delete-comment"
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Delete comment"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                  <div className="comment-text">{comment.text}</div>
                </div>
              ))
            )}
          </div>
          
          {showAddForm ? (
            <form className="comment-form" onSubmit={handleAddComment}>
              <textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows="3"
                autoFocus
              />
              <div className="comment-form-actions">
                <button type="submit" className="btn-save-comment">Post</button>
                <button 
                  type="button" 
                  className="btn-cancel-comment"
                  onClick={() => {
                    setShowAddForm(false);
                    setCommentText('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button 
              className="btn-add-comment"
              onClick={() => setShowAddForm(true)}
            >
              Add Comment
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Comments;






