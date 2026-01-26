import React, { useState } from 'react';
import { FaBullseye, FaLightbulb, FaWrench, FaFlask, FaEdit, FaTrash, FaPlus, FaChevronDown, FaChevronRight, FaChartLine, FaRocket } from 'react-icons/fa';
import EntityForm from './EntityForm';
import KPIForm from './KPIForm';
import SolutionExecutionPanel from './SolutionExecutionPanel';
import api from '../services/supabaseApi';
import './TreeView.css';

function TreeFlowBoard({ outcome, onUpdate, currentUser, teams = [], users = [], onNavigateToNote }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set([outcome.id]));
  const [editingOutcome, setEditingOutcome] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [editingSol, setEditingSol] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [showAddSol, setShowAddSol] = useState(null);
  const [showAddTest, setShowAddTest] = useState(null);
  const [showAddKPI, setShowAddKPI] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedSolutionForExecution, setSelectedSolutionForExecution] = useState(null);

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

  const toggleSection = (sectionId) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const isSectionCollapsed = (sectionId) => collapsedSections.has(sectionId);

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
      // Expand the test node to show the newly added KPI
      if (!expandedNodes.has(testId)) {
        toggleNode(testId);
      }
      onUpdate();
    } catch (error) {
      alert('Failed to create KPI');
    }
  };

  const opportunities = outcome.opportunities || [];
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredConnector, setHoveredConnector] = useState(null); // 'outcome', opportunity id, solution id, or test id
  const [creatingFromConnector, setCreatingFromConnector] = useState(null); // 'outcome', opportunity id, solution id, or test id
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const collapsed = new Set();
    (outcome.opportunities || []).forEach((opp) => {
      (opp.solutions || []).forEach((sol) => {
        collapsed.add(`sol-${sol.id}`);
        (sol.tests || []).forEach((test) => {
          collapsed.add(`test-${test.id}`);
        });
      });
    });
    return collapsed;
  }); // Track collapsed opportunities, solutions, tests

  return (
    <div className={`treeflow-product-board ${creatingFromConnector ? 'creating' : ''}`}>
      {/* OUTCOME - Root Node */}
      <div className="treeflow-hierarchy">
        <div className="treeflow-outcome-container">
          {editingOutcome ? (
            <div className="treeflow-outcome-card-editing">
              <EntityForm
                title={outcome.title}
                description={outcome.description}
                owner={outcome.owner}
                teamId={outcome.teamId}
                startDate={outcome.startDate}
                endDate={outcome.endDate}
                onSave={handleSaveOutcome}
                onCancel={() => setEditingOutcome(false)}
                currentUser={currentUser}
                teams={teams}
                showTeam={true}
              />
            </div>
          ) : (
            <div 
              className={`treeflow-outcome-card ${selectedNode === outcome.id ? 'selected' : ''} ${hoveredNode === outcome.id ? 'hovered' : ''}`}
              onClick={() => {
                setSelectedNode(outcome.id);
                toggleNode(outcome.id);
              }}
              data-node-id={outcome.id}
              onMouseEnter={() => {
                setHoveredNode(outcome.id);
                setHoveredConnector('outcome');
              }}
              onMouseLeave={() => {
                if (hoveredConnector !== 'outcome') {
                  setHoveredNode(null);
                }
              }}
            >
              <FaBullseye className="treeflow-outcome-icon" />
              <div className="treeflow-outcome-text">{outcome.title}</div>
              <div className="treeflow-card-actions" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="treeflow-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingOutcome(true);
                  }}
                  title="Edit"
                >
                  <FaEdit />
                </button>
                <button 
                  className="treeflow-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOutcome();
                  }}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Connector from Outcome to Opportunities - Always visible */}
        <div 
            className={`treeflow-connector-outcome ${hoveredConnector === 'outcome' ? 'hovered' : ''} ${opportunities.length === 0 ? 'empty' : ''}`}
            onMouseEnter={() => setHoveredConnector('outcome')}
            onMouseLeave={() => {
              if (creatingFromConnector !== 'outcome') {
                setHoveredConnector(null);
              }
            }}
          >
            <div className="treeflow-connector-line">
              {hoveredConnector === 'outcome' && !creatingFromConnector && (
                <button
                  className="treeflow-connector-add-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreatingFromConnector('outcome');
                    setHoveredConnector(null);
                  }}
                  title="Add Opportunity"
                  aria-label="Add Opportunity"
                >
                  <FaPlus />
                </button>
              )}
            </div>
          </div>
        
        {/* Inline Opportunity Creation from Connector */}
        {creatingFromConnector === 'outcome' && (
          <div className="treeflow-inline-create opportunity-create">
            <div className="treeflow-opportunities-group">
              <div className="treeflow-opportunity-group">
                <div className="treeflow-opportunity-wrapper">
                  <div className="treeflow-opportunity-card-editing treeflow-inline-create-card">
                    <EntityForm
                      onSave={async (data) => {
                        await handleAddOpportunity(data);
                        setCreatingFromConnector(null);
                        // Add visual feedback
                        setTimeout(() => {
                          const opps = outcome.opportunities || [];
                          const newOppId = opps[opps.length - 1]?.id;
                          if (newOppId) {
                            setSelectedNode(newOppId);
                            setTimeout(() => {
                              const element = document.querySelector(`[data-node-id="${newOppId}"]`);
                              if (element) {
                                element.classList.add('just-created');
                                setTimeout(() => element.classList.remove('just-created'), 2000);
                              }
                            }, 100);
                          }
                        }, 100);
                      }}
                      onCancel={() => setCreatingFromConnector(null)}
                      currentUser={currentUser}
                      parentStartDate={outcome.startDate}
                      parentEndDate={outcome.endDate}
                    />
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}

        {/* OPPORTUNITIES - Grouped under Outcome */}
      {opportunities.length > 0 && (
          <div className="treeflow-opportunities-group">
            {opportunities.map((opp, oppIndex) => {
              const solutions = opp.solutions || [];
              const isLastOpp = oppIndex === opportunities.length - 1;
              
              return (
                <div 
                  key={opp.id} 
                  className={`treeflow-opportunity-group ${hoveredNode === opp.id || (hoveredNode && solutions.some(s => s.id === hoveredNode)) ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHoveredNode(opp.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Connector line from outcome */}
                  <div 
                    className={`treeflow-connector-opportunity ${hoveredConnector === opp.id || hoveredNode === opp.id ? 'hovered' : ''}`}
                    onMouseEnter={() => setHoveredConnector(opp.id)}
                    onMouseLeave={() => setHoveredConnector(null)}
                  >
                    <div className="treeflow-connector-horizontal">
                      {hoveredConnector === opp.id && (
                        <button
                          className="treeflow-connector-add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreatingFromConnector(opp.id);
                            setHoveredConnector(null);
                          }}
                          title="Add Solution"
                          aria-label="Add Solution"
                        >
                          <FaPlus />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Opportunity Card */}
                  <div className="treeflow-opportunity-wrapper">
                  {editingOpp === opp.id ? (
                    <div className="treeflow-opportunity-card-editing">
                      <EntityForm
                        title={opp.title}
                        description={opp.description}
                        owner={opp.owner}
                        startDate={opp.startDate}
                        endDate={opp.endDate}
                        parentStartDate={outcome.startDate}
                        parentEndDate={outcome.endDate}
                        onSave={(data) => handleSaveOpportunity(opp.id, data)}
                        onCancel={() => setEditingOpp(null)}
                        currentUser={currentUser}
                      />
                    </div>
                  ) : (
                    <div 
                      className={`treeflow-opportunity-card ${selectedNode === opp.id ? 'selected' : ''} ${hoveredNode === opp.id ? 'hovered' : ''}`}
                      onClick={() => setSelectedNode(opp.id)}
                      data-node-id={opp.id}
                      onMouseEnter={() => {
                        setHoveredNode(opp.id);
                        setHoveredConnector('outcome');
                        setHoveredConnector(`solution-${opp.id}`);
                      }}
                      onMouseLeave={() => {
                        // Connector hover will be managed separately
                      }}
                    >
                      <button
                        className="treeflow-expand-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(`opp-${opp.id}`);
                        }}
                        title={isSectionCollapsed(`opp-${opp.id}`) ? 'Expand' : 'Collapse'}
                      >
                        {isSectionCollapsed(`opp-${opp.id}`) ? <FaChevronRight /> : <FaChevronDown />}
                      </button>
                      <FaLightbulb className="treeflow-opportunity-icon" />
                      <div className="treeflow-opportunity-text">{opp.title}</div>
                      <div className="treeflow-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="treeflow-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAddSol(opp.id);
                          }}
                          title="Add Solution"
                        >
                          <FaPlus />
                        </button>
                        <button 
                          className="treeflow-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingOpp(opp.id);
                          }}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="treeflow-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOpportunity(opp.id);
                          }}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add Solution Form */}
                  {showAddSol === opp.id && (
                    <div className="treeflow-opportunity-card-editing">
                      <EntityForm
                        onSave={(data) => handleAddSolution(opp.id, data)}
                        onCancel={() => setShowAddSol(null)}
                        currentUser={currentUser}
                        parentStartDate={outcome.startDate}
                        parentEndDate={outcome.endDate}
                      />
                    </div>
                  )}

                    {/* SOLUTIONS Connector - Always visible if expanded */}
                    {!isSectionCollapsed(`opp-${opp.id}`) && (
                      <div 
                        className={`treeflow-connector-solutions ${hoveredConnector === `solution-${opp.id}` || hoveredNode === opp.id ? 'hovered' : ''} ${solutions.length === 0 ? 'empty' : ''}`}
                        onMouseEnter={() => setHoveredConnector(`solution-${opp.id}`)}
                        onMouseLeave={() => {
                          if (creatingFromConnector !== opp.id) {
                            setHoveredConnector(null);
                          }
                        }}
                      >
                        <div className="treeflow-connector-line">
                          {hoveredConnector === `solution-${opp.id}` && !creatingFromConnector && (
                            <button
                              className="treeflow-connector-add-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCreatingFromConnector(opp.id);
                                setHoveredConnector(null);
                              }}
                              title="Add Solution"
                              aria-label="Add Solution"
                            >
                              <FaPlus />
                            </button>
                          )}
          </div>
        </div>
      )}

                    {/* SOLUTIONS - Nested under Opportunity */}
                    {!isSectionCollapsed(`opp-${opp.id}`) && (solutions.length > 0 || creatingFromConnector === opp.id) && (
                      <div className="treeflow-solutions-container">
                          {solutions.map((sol, solIndex) => {
              const tests = sol.tests || [];
                            const hasActiveTests = tests.some(t => t.status === 'active' || t.status === 'testing');
                            const isLastSol = solIndex === solutions.length - 1;
              
              return (
                              <div 
                                key={sol.id}
                                className={`treeflow-solution-item ${hoveredNode === sol.id ? 'highlighted' : ''}`}
                                onMouseEnter={() => setHoveredNode(sol.id)}
                                onMouseLeave={() => {
                                  if (hoveredNode === sol.id) {
                                    setHoveredNode(opp.id);
                                  }
                                }}
                              >
                                {/* Connector line from opportunity */}
                                <div className="treeflow-connector-solution">
                                  {!isLastSol && <div className="treeflow-connector-vertical"></div>}
                                  <div className="treeflow-connector-horizontal"></div>
                                </div>

                                {/* Solution Card */}
                                <div className="treeflow-solution-wrapper">
                  {editingSol === sol.id ? (
                    <div className="treeflow-solution-card-editing">
                      <EntityForm
                        title={sol.title}
                        description={sol.description}
                        owner={sol.owner}
                        startDate={sol.startDate}
                        endDate={sol.endDate}
                        parentStartDate={outcome.startDate}
                        parentEndDate={outcome.endDate}
                        onSave={(data) => handleSaveSolution(sol.id, data)}
                        onCancel={() => setEditingSol(null)}
                        currentUser={currentUser}
                      />
                    </div>
                  ) : (
                    <div 
                                      className={`treeflow-solution-card ${selectedNode === sol.id ? 'selected' : ''} ${hoveredNode === sol.id ? 'hovered' : ''}`}
                      onClick={(e) => {
                        // Check if clicking on execution summary - open panel instead
                        if (e.target.closest('.solution-execution-summary')) {
                          setSelectedSolutionForExecution(sol);
                          return;
                        }
                        setSelectedNode(sol.id);
                      }}
                                      data-node-id={sol.id}
                                      onMouseEnter={() => {
                                        setHoveredNode(sol.id);
                                        setHoveredConnector(`test-${sol.id}`);
                                      }}
                                      onMouseLeave={() => {
                                        // Let connector handle its own hover state
                                      }}
                    >
                                      <button
                                        className="treeflow-expand-toggle"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSection(`sol-${sol.id}`);
                                        }}
                                        title={isSectionCollapsed(`sol-${sol.id}`) ? 'Expand' : 'Collapse'}
                                      >
                                        {isSectionCollapsed(`sol-${sol.id}`) ? <FaChevronRight /> : <FaChevronDown />}
                                      </button>
                      <FaWrench className="treeflow-solution-icon" />
                      <div className="treeflow-solution-text">{sol.title}</div>
                      <SolutionExecutionSummary solution={sol} />
                      {hasActiveTests && (
                        <span className="treeflow-testing-badge">TESTING</span>
                      )}
                      <div className="treeflow-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="treeflow-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAddTest(sol.id);
                          }}
                          title="Add Test"
                        >
                          <FaPlus />
                        </button>
                        <button 
                          className="treeflow-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSol(sol.id);
                          }}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="treeflow-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSolution(sol.id);
                          }}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}

                                  {/* Connector from Solution to Tests - Always visible if expanded */}
                                  {!isSectionCollapsed(`sol-${sol.id}`) && (
                                    <div 
                                      className={`treeflow-connector-tests ${hoveredConnector === `test-${sol.id}` || hoveredNode === sol.id ? 'hovered' : ''} ${tests.length === 0 ? 'empty' : ''}`}
                                      onMouseEnter={() => setHoveredConnector(`test-${sol.id}`)}
                                      onMouseLeave={() => {
                                        if (creatingFromConnector !== sol.id) {
                                          setHoveredConnector(null);
                                        }
                                      }}
                                    >
                                      <div className="treeflow-connector-line">
                                        {hoveredConnector === `test-${sol.id}` && !creatingFromConnector && (
                                          <button
                                            className="treeflow-connector-add-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCreatingFromConnector(sol.id);
                                              setHoveredConnector(null);
                                            }}
                                            title="Add Test"
                                            aria-label="Add Test"
                                          >
                                            <FaPlus />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* TESTS - Nested under Solution */}
                                  {!isSectionCollapsed(`sol-${sol.id}`) && (tests.length > 0 || creatingFromConnector === sol.id) && (
                                    <div className="treeflow-tests-container">
                                      {tests.map((test, testIndex) => {
                                        const kpis = test.kpis || [];
                                        const isLastTest = testIndex === tests.length - 1;
                                        
                                        return (
                                          <div 
                                            key={test.id}
                                            className={`treeflow-test-item ${hoveredNode === test.id ? 'highlighted' : ''}`}
                                            onMouseEnter={() => {
                                              setHoveredNode(test.id);
                                              setHoveredConnector(`test-${sol.id}`);
                                            }}
                                            onMouseLeave={() => {
                                              if (hoveredNode === test.id) {
                                                setHoveredNode(sol.id);
                                              }
                                            }}
                                          >
                                            {/* Connector line from solution */}
                                            <div className="treeflow-connector-test">
                                              {!isLastTest && <div className="treeflow-connector-vertical"></div>}
                                              <div className="treeflow-connector-horizontal"></div>
                                            </div>

                                            {/* Test Card */}
                                            <div className="treeflow-test-wrapper">
                                              {editingTest === test.id ? (
                                                <div className="treeflow-test-card-editing">
                                                  <EntityForm
                                                    title={test.title}
                                                    description={test.description}
                                                    owner={test.owner}
                                                    startDate={test.startDate}
                                                    endDate={test.endDate}
                                                    parentStartDate={outcome.startDate}
                                                    parentEndDate={outcome.endDate}
                                                    onSave={(data) => handleSaveTest(test.id, data)}
                                                    onCancel={() => setEditingTest(null)}
                                                    currentUser={currentUser}
                                                  />
                                                </div>
                                              ) : (
                                                <div 
                                                  className={`treeflow-test-card ${selectedNode === test.id ? 'selected' : ''} ${hoveredNode === test.id ? 'hovered' : ''}`}
                                                  onClick={() => setSelectedNode(test.id)}
                                                  data-node-id={test.id}
                                                  onMouseEnter={() => {
                                                    setHoveredNode(test.id);
                                                    setHoveredConnector(`kpi-${test.id}`);
                                                  }}
                                                  onMouseLeave={() => {
                                                    // Let connector handle its own hover state
                                                  }}
                                                >
                                                  <button
                                                    className="treeflow-expand-toggle"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      toggleSection(`test-${test.id}`);
                                                    }}
                                                    title={isSectionCollapsed(`test-${test.id}`) ? 'Expand' : 'Collapse'}
                                                  >
                                                    {isSectionCollapsed(`test-${test.id}`) ? <FaChevronRight /> : <FaChevronDown />}
                                                  </button>
                                                  <FaFlask className="treeflow-test-icon" />
                                                  <div className="treeflow-test-text">{test.title}</div>
                                                  {test.status && (
                                                    <span className={`treeflow-status-badge treeflow-status-${test.status}`}>
                                                      {test.status.toUpperCase()}
                                                    </span>
                                                  )}
                                                  <div className="treeflow-card-actions" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                      className="treeflow-action-btn"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowAddKPI(test.id);
                                                      }}
                                                      title="Add KPI"
                                                    >
                                                      <FaPlus />
                                                    </button>
                                                    <button 
                                                      className="treeflow-action-btn"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingTest(test.id);
                                                      }}
                                                      title="Edit"
                                                    >
                                                      <FaEdit />
                                                    </button>
                                                    <button 
                                                      className="treeflow-action-btn"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTest(test.id);
                                                      }}
                                                      title="Delete"
                                                    >
                                                      <FaTrash />
                                                    </button>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Connector from Test to KPIs - Always visible if expanded */}
                                              {!isSectionCollapsed(`test-${test.id}`) && (
                                                <div 
                                                  className={`treeflow-connector-kpis ${hoveredConnector === `kpi-${test.id}` || hoveredNode === test.id ? 'hovered' : ''} ${kpis.length === 0 ? 'empty' : ''}`}
                                                  onMouseEnter={() => setHoveredConnector(`kpi-${test.id}`)}
                                                  onMouseLeave={() => {
                                                    if (creatingFromConnector !== test.id) {
                                                      setHoveredConnector(null);
                                                    }
                                                  }}
                                                >
                                                  <div className="treeflow-connector-line">
                                                    {hoveredConnector === `kpi-${test.id}` && !creatingFromConnector && (
                                                      <button
                                                        className="treeflow-connector-add-btn"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setCreatingFromConnector(test.id);
                                                          setHoveredConnector(null);
                                                        }}
                                                        title="Add KPI"
                                                        aria-label="Add KPI"
                                                      >
                                                        <FaPlus />
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              )}

                                              {/* KPIs - Nested under Test */}
                                              {!isSectionCollapsed(`test-${test.id}`) && (kpis.length > 0 || creatingFromConnector === test.id) && (
                                                <div className="treeflow-kpis-container">
                                                  {kpis.map((kpi, kpiIndex) => {
                                                    const isLastKPI = kpiIndex === kpis.length - 1;
                                                    
                                                    return (
                                                      <div 
                                                        key={kpi.id}
                                                        className={`treeflow-kpi-item ${hoveredNode === kpi.id ? 'highlighted' : ''}`}
                                                        onMouseEnter={() => {
                                                          setHoveredNode(kpi.id);
                                                          setHoveredConnector(`kpi-${test.id}`);
                                                        }}
                                                        onMouseLeave={() => {
                                                          if (hoveredNode === kpi.id) {
                                                            setHoveredNode(test.id);
                                                          }
                                                        }}
                                                      >
                                                        {/* Connector line from test */}
                                                        <div className="treeflow-connector-kpi">
                                                          {!isLastKPI && <div className="treeflow-connector-vertical"></div>}
                                                          <div className="treeflow-connector-horizontal"></div>
                                                        </div>

                                                        {/* KPI Card */}
                                                        <div className="treeflow-kpi-wrapper">
                                                          <div 
                                                            className={`treeflow-kpi-card ${selectedNode === kpi.id ? 'selected' : ''} ${hoveredNode === kpi.id ? 'hovered' : ''}`}
                                                            onClick={() => setSelectedNode(kpi.id)}
                                                            data-node-id={kpi.id}
                                                          >
                                                            <FaChartLine className="treeflow-kpi-icon" />
                                                            <div className="treeflow-kpi-content">
                                                              <div className="treeflow-kpi-name">{kpi.name}</div>
                                                              <div className="treeflow-kpi-values">
                                                                Current: <strong>{kpi.current || 'N/A'}</strong>
                                                                {kpi.unit && ` ${kpi.unit}`} / 
                                                                Target: <strong>{kpi.target || 'N/A'}</strong>
                                                                {kpi.unit && ` ${kpi.unit}`}
                                                              </div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}

                                                  {/* Inline KPI Creation from Connector */}
                                                  {creatingFromConnector === test.id && (
                                                    <div className="treeflow-kpi-item">
                                                      <div className="treeflow-kpi-wrapper">
                                                        <div className="treeflow-kpi-card-editing treeflow-inline-create-card">
                                                          <KPIForm
                                                            onSave={async (data) => {
                                                              await handleAddKPI(test.id, data);
                                                              setCreatingFromConnector(null);
                                                              // Add visual feedback
                                                              setTimeout(() => {
                                                                const newKpiId = test.kpis?.[test.kpis.length - 1]?.id;
                                                                if (newKpiId) {
                                                                  setSelectedNode(newKpiId);
                                                                  const element = document.querySelector(`[data-node-id="${newKpiId}"]`);
                                                                  if (element) {
                                                                    element.classList.add('just-created');
                                                                    setTimeout(() => element.classList.remove('just-created'), 2000);
                                                                  }
                                                                }
                                                              }, 100);
                                                            }}
                                                            onCancel={() => setCreatingFromConnector(null)}
                                                          />
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {/* Add KPI Form - Fallback */}
                                              {showAddKPI === test.id && creatingFromConnector !== test.id && (
                                                <div className="treeflow-kpi-card-editing">
                                                  <KPIForm
                                                    onSave={async (data) => {
                                                      await handleAddKPI(test.id, data);
                                                      setShowAddKPI(null);
                                                    }}
                                                    onCancel={() => setShowAddKPI(null)}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {/* Inline Test Creation from Connector */}
                                      {creatingFromConnector === sol.id && (
                                        <div className="treeflow-test-item">
                                          <div className="treeflow-test-wrapper">
                                            <div className="treeflow-test-card-editing treeflow-inline-create-card">
                                              <EntityForm
                                                onSave={async (data) => {
                                                  await handleAddTest(sol.id, data);
                                                  setCreatingFromConnector(null);
                                                  // Add visual feedback
                                                  setTimeout(() => {
                                                    const newTestId = sol.tests?.[sol.tests.length - 1]?.id;
                                                    if (newTestId) {
                                                      setSelectedNode(newTestId);
                                                      const element = document.querySelector(`[data-node-id="${newTestId}"]`);
                                                      if (element) {
                                                        element.classList.add('just-created');
                                                        setTimeout(() => element.classList.remove('just-created'), 2000);
                                                      }
                                                    }
                                                  }, 100);
                                                }}
                                                onCancel={() => setCreatingFromConnector(null)}
                                                currentUser={currentUser}
                                                parentStartDate={outcome.startDate}
                                                parentEndDate={outcome.endDate}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Add Test Form - Fallback */}
                                  {showAddTest === sol.id && creatingFromConnector !== sol.id && (
                    <div className="treeflow-solution-card-editing">
                      <EntityForm
                        onSave={(data) => handleAddTest(sol.id, data)}
                        onCancel={() => setShowAddTest(null)}
                        currentUser={currentUser}
                        parentStartDate={outcome.startDate}
                        parentEndDate={outcome.endDate}
                      />
                    </div>
                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Inline Solution Creation from Connector */}
                          {creatingFromConnector === opp.id && (
                            <div className="treeflow-solution-item">
                              <div className="treeflow-solution-wrapper">
                                <div className="treeflow-solution-card-editing treeflow-inline-create-card">
                                  <EntityForm
                                    onSave={async (data) => {
                                      await handleAddSolution(opp.id, data);
                                      setCreatingFromConnector(null);
                                      // Add visual feedback
                                      setTimeout(() => {
                                        const newSolId = opp.solutions?.[opp.solutions.length - 1]?.id;
                                        if (newSolId) {
                                          setSelectedNode(newSolId);
                                          const element = document.querySelector(`[data-node-id="${newSolId}"]`);
                                          if (element) {
                                            element.classList.add('just-created');
                                            setTimeout(() => element.classList.remove('just-created'), 2000);
                                          }
                                        }
                                      }, 100);
                                    }}
                                    onCancel={() => setCreatingFromConnector(null)}
                                    currentUser={currentUser}
                                    parentStartDate={outcome.startDate}
                                    parentEndDate={outcome.endDate}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

        {/* Add Opportunity Button - Fallback (when not using connector) */}
        {opportunities.length === 0 && !showAddOpp && !creatingFromConnector && (
          <div className="treeflow-add-opportunity">
          <button 
            className="treeflow-add-btn-large"
            onClick={() => setShowAddOpp(true)}
          >
            <FaPlus /> Add Opportunity
          </button>
        </div>
      )}

        {/* Add Opportunity Form - Fallback (when not using connector) */}
        {showAddOpp && !creatingFromConnector && (
          <div className="treeflow-add-opportunity">
            <div className="treeflow-opportunities-group">
              <div className="treeflow-opportunity-group">
          <div className="treeflow-opportunity-wrapper">
            <div className="treeflow-opportunity-card-editing">
              <EntityForm
                onSave={handleAddOpportunity}
                onCancel={() => setShowAddOpp(false)}
                currentUser={currentUser}
                parentStartDate={outcome.startDate}
                parentEndDate={outcome.endDate}
              />
            </div>
          </div>
        </div>
          </div>
        </div>
      )}
      </div>

      {/* Solution Execution Panel */}
      {selectedSolutionForExecution && (
        <SolutionExecutionPanel
          solution={selectedSolutionForExecution}
          onClose={() => setSelectedSolutionForExecution(null)}
          currentUser={currentUser}
          users={users}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

function SolutionExecutionSummary({ solution }) {
  const campaigns = solution.campaigns || [];
  const totalCampaigns = campaigns.length;
  const totalTasks = campaigns.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
  const doneTasks = campaigns.reduce((sum, c) => 
    sum + (c.tasks?.filter(t => t.status === 'done').length || 0), 0
  );
  const openTasks = campaigns.reduce((sum, c) => 
    sum + (c.tasks?.filter(t => t.status !== 'done').length || 0), 0
  );
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (totalCampaigns === 0 && totalTasks === 0) {
    return (
      <div className="solution-execution-summary empty">
        <FaRocket className="execution-icon" />
        <span>0 sprints</span>
      </div>
    );
  }

  return (
    <div className="solution-execution-summary">
      <FaRocket className="execution-icon" />
      <div className="solution-progress-content">
        <span className="solution-progress-text">{progressPercent}% • {openTasks} open</span>
        {totalTasks > 0 && (
          <div className="solution-progress-bar">
            <div 
              className="solution-progress-fill" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TreeFlowBoard;
