import React, { useState } from 'react';
import { FaBullseye, FaLightbulb, FaWrench, FaFlask, FaEdit, FaTrash, FaPlus, FaChevronDown, FaChevronRight, FaChartLine } from 'react-icons/fa';
import EntityForm from './EntityForm';
import KPIForm from './KPIForm';
import api from '../services/supabaseApi';
import './TreeView.css';

function ClassicalTreeView({ outcome, onUpdate, currentUser, teams = [], users = [], onNavigateToNote }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set([outcome.id]));
  const [editingOutcome, setEditingOutcome] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [editingSol, setEditingSol] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [showAddSol, setShowAddSol] = useState(null);
  const [showAddTest, setShowAddTest] = useState(null);
  const [showAddKPI, setShowAddKPI] = useState(null);

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const isExpanded = (nodeId) => expandedNodes.has(nodeId);

  const handleDeleteOutcome = async () => {
    if (window.confirm('Are you sure you want to delete this outcome and all its children?')) {
      try {
        await api.deleteOutcome(outcome.id);
        onUpdate();
      } catch (error) {
        alert(error.message || 'Failed to delete outcome');
      }
    }
  };

  const handleSaveOutcome = async (data) => {
    try {
      await api.updateOutcome(outcome.id, data);
      setEditingOutcome(false);
      onUpdate();
    } catch (error) {
      alert('Failed to update outcome');
    }
  };

  const handleAddOpportunity = async (data) => {
    try {
      await api.createOpportunity(outcome.id, data);
      setShowAddOpp(false);
      onUpdate();
    } catch (error) {
      alert('Failed to create opportunity');
    }
  };

  const handleSaveOpportunity = async (oppId, data) => {
    try {
      await api.updateOpportunity(oppId, data);
      setEditingOpp(null);
      onUpdate();
    } catch (error) {
      alert('Failed to update opportunity');
    }
  };

  const handleDeleteOpportunity = async (oppId) => {
    if (window.confirm('Are you sure you want to delete this opportunity and all its solutions?')) {
      try {
        await api.deleteOpportunity(oppId);
        onUpdate();
      } catch (error) {
        alert('Failed to delete opportunity');
      }
    }
  };

  const handleAddSolution = async (oppId, data) => {
    try {
      await api.createSolution(oppId, data);
      setShowAddSol(null);
      onUpdate();
    } catch (error) {
      alert('Failed to create solution');
    }
  };

  const handleSaveSolution = async (solId, data) => {
    try {
      await api.updateSolution(solId, data);
      setEditingSol(null);
      onUpdate();
    } catch (error) {
      alert('Failed to update solution');
    }
  };

  const handleDeleteSolution = async (solId) => {
    if (window.confirm('Are you sure you want to delete this solution and all its tests?')) {
      try {
        await api.deleteSolution(solId);
        onUpdate();
      } catch (error) {
        alert('Failed to delete solution');
      }
    }
  };

  const handleAddTest = async (solId, data) => {
    try {
      await api.createTest(solId, data);
      setShowAddTest(null);
      onUpdate();
    } catch (error) {
      alert('Failed to create test');
    }
  };

  const handleSaveTest = async (testId, data) => {
    try {
      await api.updateTest(testId, data);
      setEditingTest(null);
      onUpdate();
    } catch (error) {
      alert('Failed to update test');
    }
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test and all its KPIs?')) {
      try {
        await api.deleteTest(testId);
        onUpdate();
      } catch (error) {
        alert('Failed to delete test');
      }
    }
  };

  const handleAddKPI = async (testId, data) => {
    try {
      await api.createKPI(testId, data);
      setShowAddKPI(null);
      onUpdate();
    } catch (error) {
      alert('Failed to create KPI');
    }
  };

  const opportunities = outcome.opportunities || [];

  return (
    <div className="classical-tree-container">
      {/* Outcome - Root */}
      <ClassicalTreeNode
        nodeId={outcome.id}
        level={0}
        type="outcome"
        title={outcome.title}
        icon={<FaBullseye />}
        isExpanded={isExpanded(outcome.id)}
        onToggle={() => toggleNode(outcome.id)}
        onEdit={() => setEditingOutcome(true)}
        onDelete={handleDeleteOutcome}
        onAdd={() => setShowAddOpp(true)}
        addLabel="Add Opportunity"
        editing={editingOutcome}
        onCancel={() => setEditingOutcome(false)}
        onSave={handleSaveOutcome}
        formData={{
          title: outcome.title,
          description: outcome.description,
          owner: outcome.owner,
          teamId: outcome.teamId,
          startDate: outcome.startDate,
          endDate: outcome.endDate
        }}
        currentUser={currentUser}
        teams={teams}
        showTeam={true}
        isRoot={true}
      >
        {isExpanded(outcome.id) && opportunities.map((opp, oppIndex) => {
          const solutions = opp.solutions || [];
          const isLastOpp = oppIndex === opportunities.length - 1;

          return (
            <ClassicalTreeNode
              key={opp.id}
              nodeId={opp.id}
              level={1}
              type="opportunity"
              title={opp.title}
              icon={<FaLightbulb />}
              isExpanded={isExpanded(opp.id)}
              onToggle={() => toggleNode(opp.id)}
              onEdit={() => setEditingOpp(opp.id)}
              onDelete={() => handleDeleteOpportunity(opp.id)}
              onAdd={() => setShowAddSol(opp.id)}
              addLabel="Add Solution"
              editing={editingOpp === opp.id}
              onCancel={() => setEditingOpp(null)}
              onSave={(data) => handleSaveOpportunity(opp.id, data)}
              formData={{
                title: opp.title,
                description: opp.description,
                owner: opp.owner,
                startDate: opp.startDate,
                endDate: opp.endDate
              }}
              currentUser={currentUser}
              parentStartDate={outcome.startDate}
              parentEndDate={outcome.endDate}
              isLast={isLastOpp}
            >
              {isExpanded(opp.id) && solutions.map((sol, solIndex) => {
                const tests = sol.tests || [];
                const isLastSol = solIndex === solutions.length - 1;

                return (
                  <ClassicalTreeNode
                    key={sol.id}
                    nodeId={sol.id}
                    level={2}
                    type="solution"
                    title={sol.title}
                    icon={<FaWrench />}
                    isExpanded={isExpanded(sol.id)}
                    onToggle={() => toggleNode(sol.id)}
                    onEdit={() => setEditingSol(sol.id)}
                    onDelete={() => handleDeleteSolution(sol.id)}
                    onAdd={() => setShowAddTest(sol.id)}
                    addLabel="Add Test"
                    editing={editingSol === sol.id}
                    onCancel={() => setEditingSol(null)}
                    onSave={(data) => handleSaveSolution(sol.id, data)}
                    formData={{
                      title: sol.title,
                      description: sol.description,
                      owner: sol.owner,
                      startDate: sol.startDate,
                      endDate: sol.endDate
                    }}
                    currentUser={currentUser}
                    parentStartDate={outcome.startDate}
                    parentEndDate={outcome.endDate}
                    isLast={isLastSol}
                  >
                    {isExpanded(sol.id) && tests.map((test, testIndex) => {
                      const kpis = test.kpis || [];
                      const isLastTest = testIndex === tests.length - 1;

                      return (
                        <ClassicalTreeNode
                          key={test.id}
                          nodeId={test.id}
                          level={3}
                          type="test"
                          title={test.title}
                          icon={<FaFlask />}
                          isExpanded={isExpanded(test.id)}
                          onToggle={() => toggleNode(test.id)}
                          onEdit={() => setEditingTest(test.id)}
                          onDelete={() => handleDeleteTest(test.id)}
                          onAdd={() => setShowAddKPI(test.id)}
                          addLabel="Add KPI"
                          editing={editingTest === test.id}
                          onCancel={() => setEditingTest(null)}
                          onSave={(data) => handleSaveTest(test.id, data)}
                          formData={{
                            title: test.title,
                            description: test.description,
                            owner: test.owner,
                            startDate: test.startDate,
                            endDate: test.endDate
                          }}
                          currentUser={currentUser}
                          parentStartDate={outcome.startDate}
                          parentEndDate={outcome.endDate}
                          isLast={isLastTest}
                        >
                          {isExpanded(test.id) && kpis.map((kpi, kpiIndex) => {
                            const isLastKPI = kpiIndex === kpis.length - 1;

                            return (
                              <ClassicalTreeNode
                                key={kpi.id}
                                nodeId={kpi.id}
                                level={4}
                                type="kpi"
                                title={`${kpi.name}: ${kpi.current !== null ? kpi.current : 'N/A'} / ${kpi.target !== null ? kpi.target : 'N/A'} ${kpi.unit || ''}`}
                                icon={<FaChartLine />}
                                isExpanded={false}
                                onToggle={() => {}}
                                isLast={isLastKPI}
                                isLeaf={true}
                              />
                            );
                          })}
                          {showAddKPI === test.id && (
                            <div className="classical-tree-node classical-tree-level-4">
                              <div className="classical-tree-form">
                                <KPIForm
                                  onSave={(data) => handleAddKPI(test.id, data)}
                                  onCancel={() => setShowAddKPI(null)}
                                />
                              </div>
                            </div>
                          )}
                        </ClassicalTreeNode>
                      );
                    })}
                    {showAddTest === sol.id && (
                      <div className="classical-tree-node classical-tree-level-3">
                        <div className="classical-tree-form">
                          <EntityForm
                            onSave={(data) => handleAddTest(sol.id, data)}
                            onCancel={() => setShowAddTest(null)}
                            currentUser={currentUser}
                            parentStartDate={outcome.startDate}
                            parentEndDate={outcome.endDate}
                          />
                        </div>
                      </div>
                    )}
                  </ClassicalTreeNode>
                );
              })}
              {showAddSol === opp.id && (
                <div className="classical-tree-node classical-tree-level-2">
                  <div className="classical-tree-form">
                    <EntityForm
                      onSave={(data) => handleAddSolution(opp.id, data)}
                      onCancel={() => setShowAddSol(null)}
                      currentUser={currentUser}
                      parentStartDate={outcome.startDate}
                      parentEndDate={outcome.endDate}
                    />
                  </div>
                </div>
              )}
            </ClassicalTreeNode>
          );
        })}
        {showAddOpp && (
          <div className="classical-tree-node classical-tree-level-1">
            <div className="classical-tree-form">
              <EntityForm
                onSave={handleAddOpportunity}
                onCancel={() => setShowAddOpp(false)}
                currentUser={currentUser}
                parentStartDate={outcome.startDate}
                parentEndDate={outcome.endDate}
              />
            </div>
          </div>
        )}
      </ClassicalTreeNode>
    </div>
  );
}

// Classical Tree Node Component
function ClassicalTreeNode({
  nodeId,
  level,
  type,
  title,
  icon,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  addLabel,
  editing,
  onCancel,
  onSave,
  formData,
  currentUser,
  teams,
  showTeam,
  parentStartDate,
  parentEndDate,
  isLast,
  isLeaf,
  isRoot,
  children
}) {
  const hasChildren = children && React.Children.count(children) > 0;
  const canExpand = !isLeaf && (hasChildren || onAdd);

  return (
    <div className={`classical-tree-node classical-tree-level-${level} classical-tree-type-${type}`}>
      <div className="classical-tree-line">
        {level > 0 && (
          <>
            <div className={`classical-tree-vertical ${isLast ? 'last' : ''}`}></div>
            <div className="classical-tree-horizontal"></div>
          </>
        )}
      </div>

      <div className="classical-tree-content">
        {editing ? (
          <div className="classical-tree-form">
            <EntityForm
              {...formData}
              onSave={onSave}
              onCancel={onCancel}
              currentUser={currentUser}
              teams={teams}
              showTeam={showTeam}
              parentStartDate={parentStartDate}
              parentEndDate={parentEndDate}
            />
          </div>
        ) : (
          <div className={`classical-tree-card classical-tree-card-${type}`}>
            {canExpand && (
              <button
                className="classical-tree-expand"
                onClick={onToggle}
                type="button"
              >
                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
              </button>
            )}
            {!canExpand && level > 0 && (
              <span className="classical-tree-spacer"></span>
            )}

            <div className={`classical-tree-icon classical-tree-icon-${type}`}>
              {icon}
            </div>

            <div className="classical-tree-title">{title}</div>

            {!isLeaf && (
              <div className="classical-tree-actions">
                {onAdd && (
                  <button
                    className="classical-tree-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdd();
                    }}
                    title={addLabel}
                    type="button"
                  >
                    <FaPlus />
                  </button>
                )}
                {onEdit && (
                  <button
                    className="classical-tree-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    title="Edit"
                    type="button"
                  >
                    <FaEdit />
                  </button>
                )}
                {onDelete && (
                  <button
                    className="classical-tree-action-btn classical-tree-action-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    title="Delete"
                    type="button"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="classical-tree-children">
          {children}
        </div>
      )}
    </div>
  );
}

export default ClassicalTreeView;

