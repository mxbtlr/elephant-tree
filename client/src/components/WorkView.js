import React, { useEffect, useMemo, useState } from 'react';
import { FaBullseye, FaFlask, FaLightbulb } from 'react-icons/fa';
import api from '../services/supabaseApi';
import Avatar from './Avatar';
import './WorkView.css';

const isTodayOrOverdue = (date) => {
  if (!date) return false;
  const today = new Date();
  const target = new Date(date);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return targetMidnight <= todayMidnight;
};

const isCompletedWithin24h = (updatedAt) => {
  if (!updatedAt) return false;
  const since = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(updatedAt).getTime() >= since;
};

function WorkView({ workspaceId, onOpenNode, users = [] }) {
  const userById = useMemo(() => {
    const map = {};
    users.forEach((user) => {
      map[user.id] = user;
    });
    return map;
  }, [users]);
  const [todos, setTodos] = useState([]);
  const [collapsed, setCollapsed] = useState({
    today: false,
    upcoming: false,
    completed: true
  });
  const [feedbackById, setFeedbackById] = useState({});
  const feedbackMessages = ['Done.', 'Nice.', 'Step forward.', 'Good work.'];

  const loadTodos = async () => {
    if (!workspaceId) return;
    try {
      const list = await api.listWorkspaceTodos(workspaceId);
      setTodos(list || []);
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  };

  useEffect(() => {
    void loadTodos();
  }, [workspaceId]);

  const openTodos = useMemo(() => todos.filter((t) => !t.is_done), [todos]);
  const completedToday = useMemo(
    () => todos.filter((t) => t.is_done && isCompletedWithin24h(t.updated_at)),
    [todos]
  );

  const sections = useMemo(() => {
    const today = [];
    const upcoming = [];
    openTodos.forEach((todo) => {
      if (isTodayOrOverdue(todo.due_date)) {
        today.push(todo);
      } else {
        upcoming.push(todo);
      }
    });
    return { today, upcoming };
  }, [openTodos]);

  const grouped = (list) => {
    const map = new Map();
    list.forEach((todo) => {
      const key = todo.experiment_id;
      if (!map.has(key)) {
        map.set(key, {
          experimentId: todo.experiment_id,
          experimentTitle: todo.experiment_title,
          solutionTitle: todo.solution_title,
          opportunityTitle: todo.opportunity_title,
          outcomeTitle: todo.outcome_title,
          todos: []
        });
      }
      map.get(key).todos.push(todo);
    });
    return Array.from(map.values());
  };

  const toggleTodo = async (todo) => {
    try {
      await api.toggleExperimentTodo(todo.id, !todo.is_done);
      if (!todo.is_done) {
        const message = feedbackMessages[Math.floor(Math.random() * feedbackMessages.length)];
        setFeedbackById((prev) => ({ ...prev, [todo.id]: message }));
        setTimeout(() => {
          setFeedbackById((prev) => {
            const next = { ...prev };
            delete next[todo.id];
            return next;
          });
        }, 1800);
      }
      await loadTodos();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const renderGroup = (group) => {
    const ownerUser =
      userById[group.todos?.[0]?.owner_id || group.todos?.[0]?.owner || group.todos?.[0]?.assignee_id] ||
      null;
    return (
      <div key={group.experimentId} className="work-group">
        <button
          type="button"
          className="work-group-title"
          onClick={() => onOpenNode?.(`test:${group.experimentId}`)}
        >
          <div>{group.experimentTitle || 'Experiment'}</div>
          <div className="work-group-meta">
            <span className="work-meta-item">
              <FaFlask /> {group.solutionTitle || 'Solution'}
            </span>
            {group.opportunityTitle && (
              <span className="work-meta-item">
                <FaLightbulb /> {group.opportunityTitle}
              </span>
            )}
            {group.outcomeTitle && (
              <span className="work-meta-item">
                <FaBullseye /> {group.outcomeTitle}
              </span>
            )}
          </div>
        </button>
        {ownerUser && (
          <div className="work-group-owner">
            <Avatar user={ownerUser} size={24} isOwner />
          </div>
        )}
        <div className="work-todo-list">
          {group.todos.map((todo) => {
            const assignee =
              userById[todo.assignee_id || todo.assigneeId || todo.owner_id || todo.owner] || null;
            return (
              <div
                key={todo.id}
                className={`work-todo-row ${todo.is_done ? 'done' : ''} ${
                  feedbackById[todo.id] ? 'just-completed' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={todo.is_done}
                  onChange={() => void toggleTodo(todo)}
                />
                {assignee && <Avatar user={assignee} size={20} />}
                <button
                  type="button"
                  className="work-todo-title"
                  onClick={() => onOpenNode?.(`test:${group.experimentId}`)}
                >
                  {todo.title}
                </button>
                {feedbackById[todo.id] && (
                  <div className="work-todo-feedback">{feedbackById[todo.id]}</div>
                )}
                <div className="work-todo-date">
                  {todo.due_date ? new Date(todo.due_date).toLocaleDateString() : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const experimentCount = useMemo(
    () => new Set(todos.map((todo) => todo.experiment_id)).size,
    [todos]
  );
  const taskCount = openTodos.length;

  return (
    <div className="work-view">
      <div className="work-hero">
        <div className="work-hero-title">Today is yours.</div>
        <div className="work-hero-subtitle">
          {experimentCount ? `${experimentCount} experiment${experimentCount === 1 ? '' : 's'}` : 'No experiments yet'}
          {' · '}
          {taskCount ? `${taskCount} task${taskCount === 1 ? '' : 's'}` : 'Nothing urgent right now'}
        </div>
        <div className="work-hero-message">
          Keep it calm and focused. Small steps count.
        </div>
      </div>
      <div className="work-section work-section-primary">
        <button type="button" className="work-section-header" onClick={() => setCollapsed((prev) => ({ ...prev, today: !prev.today }))}>
          <span>Today’s focus</span>
          <span>{collapsed.today ? '+' : '–'}</span>
        </button>
        {!collapsed.today && (
          <div className="work-section-content">
            {grouped(sections.today).map(renderGroup)}
            {sections.today.length === 0 && (
              <div className="work-empty">
                A calm day. If you want, open a test or sketch the next experiment.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="work-section">
        <button type="button" className="work-section-header" onClick={() => setCollapsed((prev) => ({ ...prev, upcoming: !prev.upcoming }))}>
          <span>Coming up</span>
          <span>{collapsed.upcoming ? '+' : '–'}</span>
        </button>
        {!collapsed.upcoming && (
          <div className="work-section-content">
            {grouped(sections.upcoming).map(renderGroup)}
            {sections.upcoming.length === 0 && (
              <div className="work-empty">Nothing scheduled yet. That’s okay.</div>
            )}
          </div>
        )}
      </div>

      <div className="work-section work-section-muted">
        <button type="button" className="work-section-header" onClick={() => setCollapsed((prev) => ({ ...prev, completed: !prev.completed }))}>
          <span>Nice work ✨</span>
          <span>{collapsed.completed ? '+' : '–'}</span>
        </button>
        {!collapsed.completed && (
          <div className="work-section-content">
            <div className="work-completed-message">
              You moved {completedToday.length} task{completedToday.length === 1 ? '' : 's'} forward today.
            </div>
            {grouped(completedToday).map(renderGroup)}
            {completedToday.length === 0 && (
              <div className="work-empty">No completions yet. There’s time.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkView;
