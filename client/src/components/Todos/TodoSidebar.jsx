import React, { useMemo, useState } from 'react';
import { FaChevronDown, FaChevronLeft } from 'react-icons/fa';
import TodoEmptyState from './TodoEmptyState';
import TodoTestCard from './TodoTestCard';
import todoMessages from './todoMessages';
import './TodoSidebar.css';

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

function TodoSidebar({
  isOpen,
  todos = [],
  users = [],
  testMetaById = {},
  highlightedIds = new Set(),
  onOpenTest,
  onToggleTodo,
  onAssignOwner,
  onClose
}) {
  const [collapsed, setCollapsed] = useState({
    today: false,
    upcoming: false,
    completed: true
  });
  const [expandedCards, setExpandedCards] = useState({});
  const [toastByTodoId, setToastByTodoId] = useState({});

  const openTodos = useMemo(() => todos.filter((todo) => !todo.is_done), [todos]);
  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.is_done && isCompletedWithin24h(todo.updated_at)),
    [todos]
  );

  const grouped = useMemo(() => {
    const today = [];
    const upcoming = [];
    openTodos.forEach((todo) => {
      if (isTodayOrOverdue(todo.due_date)) {
        today.push(todo);
      } else {
        upcoming.push(todo);
      }
    });
    const groupByExperiment = (list) => {
      const map = new Map();
      list.forEach((todo) => {
        const key = todo.experiment_id || 'unknown';
        if (!map.has(key)) {
          map.set(key, {
            experimentId: todo.experiment_id,
            experimentTitle: todo.experiment_title,
            opportunityTitle: todo.opportunity_title,
            todos: []
          });
        }
        map.get(key).todos.push(todo);
      });
      const groups = Array.from(map.values());
      groups.forEach((group) => {
        group.todos.sort((a, b) => {
          const dueA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const dueB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          if (dueA !== dueB) return dueA - dueB;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      });
      groups.sort((a, b) => {
        const aHasDue = a.todos.some((todo) => todo.due_date);
        const bHasDue = b.todos.some((todo) => todo.due_date);
        if (aHasDue !== bHasDue) return aHasDue ? -1 : 1;
        const aEarliest = a.todos.reduce((min, todo) => {
          if (!todo.due_date) return min;
          return Math.min(min, new Date(todo.due_date).getTime());
        }, Infinity);
        const bEarliest = b.todos.reduce((min, todo) => {
          if (!todo.due_date) return min;
          return Math.min(min, new Date(todo.due_date).getTime());
        }, Infinity);
        if (aEarliest !== bEarliest) return aEarliest - bEarliest;
        const aUpdated = Math.max(...a.todos.map((todo) => new Date(todo.updated_at).getTime()));
        const bUpdated = Math.max(...b.todos.map((todo) => new Date(todo.updated_at).getTime()));
        return bUpdated - aUpdated;
      });
      return groups;
    };
    return {
      today: groupByExperiment(today),
      upcoming: groupByExperiment(upcoming),
      completed: groupByExperiment(completedTodos)
    };
  }, [openTodos, completedTodos]);

  const handleToggleTodo = async (todo) => {
    const message = todoMessages[Math.floor(Math.random() * todoMessages.length)];
    setToastByTodoId((prev) => ({ ...prev, [todo.id]: message }));
    setTimeout(() => {
      setToastByTodoId((prev) => {
        const next = { ...prev };
        delete next[todo.id];
        return next;
      });
    }, 1600);
    await onToggleTodo?.(todo);
  };

  const renderSection = (key, title, emptyMessage, list) => (
    <div className="todo-sidebar-section">
      <button
        type="button"
        className="todo-sidebar-section-header"
        onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
      >
        <span>{title}</span>
        <FaChevronDown className={collapsed[key] ? '' : 'open'} />
      </button>
      {!collapsed[key] && (
        <>
          {list.length > 0 ? (
            list.map((group) => (
              <TodoTestCard
                key={group.experimentId}
                group={group}
                testMeta={testMetaById[group.experimentId]}
                users={users}
                expanded={Boolean(expandedCards[group.experimentId])}
                onToggleExpand={() =>
                  setExpandedCards((prev) => ({
                    ...prev,
                    [group.experimentId]: !prev[group.experimentId]
                  }))
                }
                onOpenTest={(id) => onOpenTest?.(id)}
                onToggleTodo={handleToggleTodo}
                onAssignOwner={onAssignOwner}
                toastMessageById={toastByTodoId}
                isHighlighted={highlightedIds.has(group.experimentId)}
              />
            ))
          ) : (
            <TodoEmptyState message={emptyMessage} />
          )}
        </>
      )}
    </div>
  );

  return (
    <aside className={`todo-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="todo-sidebar-header">
        <div>
          <div className="todo-sidebar-title">Todo</div>
          <div className="todo-sidebar-subtitle">Your next small steps</div>
        </div>
        <button
          type="button"
          className="todo-sidebar-collapse"
          onClick={onClose}
          aria-label="Collapse todo sidebar"
        >
          <FaChevronLeft />
        </button>
      </div>
      {renderSection('today', 'Today', 'No urgent steps today. That’s okay.', grouped.today)}
      {renderSection('upcoming', 'Upcoming', 'Nothing queued. Add a task from any test.', grouped.upcoming)}
      {renderSection('completed', 'Completed today', 'No completions yet.', grouped.completed)}
    </aside>
  );
}

export default TodoSidebar;
