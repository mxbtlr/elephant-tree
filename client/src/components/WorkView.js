import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/supabaseApi';
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

function WorkView({ workspaceId, onOpenNode }) {
  const [todos, setTodos] = useState([]);
  const [collapsed, setCollapsed] = useState({
    today: false,
    upcoming: false,
    completed: true
  });

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
      await loadTodos();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const renderGroup = (group) => (
    <div key={group.experimentId} className="work-group">
      <button
        type="button"
        className="work-group-title"
        onClick={() => onOpenNode?.(`test:${group.experimentId}`)}
      >
        <div>{group.experimentTitle || 'Experiment'}</div>
        <div className="work-group-meta">
          {group.solutionTitle || 'Solution'}
          {group.opportunityTitle ? ` · ${group.opportunityTitle}` : ''}
          {group.outcomeTitle ? ` · ${group.outcomeTitle}` : ''}
        </div>
      </button>
      <div className="work-todo-list">
        {group.todos.map((todo) => (
          <div key={todo.id} className="work-todo-row">
            <input
              type="checkbox"
              checked={todo.is_done}
              onChange={() => void toggleTodo(todo)}
            />
            <button
              type="button"
              className="work-todo-title"
              onClick={() => onOpenNode?.(`test:${group.experimentId}`)}
            >
              {todo.title}
            </button>
            <div className="work-todo-date">
              {todo.due_date ? new Date(todo.due_date).toLocaleDateString() : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="work-view">
      <div className="work-section work-section-primary">
        <button type="button" className="work-section-header" onClick={() => setCollapsed((prev) => ({ ...prev, today: !prev.today }))}>
          <span>Today</span>
          <span>{collapsed.today ? '+' : '–'}</span>
        </button>
        {!collapsed.today && (
          <div className="work-section-content">
            {grouped(sections.today).map(renderGroup)}
            {sections.today.length === 0 && (
              <div className="work-empty">
                Nothing urgent today. Pick an experiment below to make progress.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="work-section">
        <button type="button" className="work-section-header" onClick={() => setCollapsed((prev) => ({ ...prev, upcoming: !prev.upcoming }))}>
          <span>Upcoming</span>
          <span>{collapsed.upcoming ? '+' : '–'}</span>
        </button>
        {!collapsed.upcoming && (
          <div className="work-section-content">
            {grouped(sections.upcoming).map(renderGroup)}
            {sections.upcoming.length === 0 && <div className="work-empty">No upcoming to-dos.</div>}
          </div>
        )}
      </div>

      <div className="work-section work-section-muted">
        <button type="button" className="work-section-header" onClick={() => setCollapsed((prev) => ({ ...prev, completed: !prev.completed }))}>
          <span>Completed today</span>
          <span>{collapsed.completed ? '+' : '–'}</span>
        </button>
        {!collapsed.completed && (
          <div className="work-section-content">
            <div className="work-completed-message">
              You completed {completedToday.length} tasks today.
            </div>
            {grouped(completedToday).map(renderGroup)}
            {completedToday.length === 0 && <div className="work-empty">No completions in the last 24h.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkView;
