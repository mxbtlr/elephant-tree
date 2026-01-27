import React, { useEffect, useState } from 'react';
import api from '../services/supabaseApi';
import './DashboardView.css';

function DashboardView({ workspaceId, onOpenOpportunity }) {
  const [metrics, setMetrics] = useState(null);
  const [atRisk, setAtRisk] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!workspaceId) return;
      try {
        const [metricsData, atRiskData] = await Promise.all([
          api.getDecisionHealthMetrics(workspaceId),
          api.getAtRiskOpportunities(workspaceId)
        ]);
        setMetrics(metricsData);
        setAtRisk(atRiskData || []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      }
    };
    void load();
  }, [workspaceId]);

  if (!metrics) {
    return <div className="dashboard-view">Loading dashboard…</div>;
  }

  return (
    <div className="dashboard-view">
      <div className="dashboard-panel">
        <div className="dashboard-title">Decision Health</div>
        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="dashboard-card-label">Unvalidated hypotheses</div>
            <div className="dashboard-card-value">{metrics.unvalidated_hypotheses || 0}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Running experiments</div>
            <div className="dashboard-card-value">{metrics.running_experiments || 0}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Blocked experiments</div>
            <div className="dashboard-card-value">{metrics.blocked_experiments || 0}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Validated opportunities</div>
            <div className="dashboard-card-value">{metrics.validated_opportunities || 0}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Avg time to decision (days)</div>
            <div className="dashboard-card-value">
              {metrics.avg_time_to_decision_days
                ? metrics.avg_time_to_decision_days.toFixed(1)
                : '—'}
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-label">Momentum (7d)</div>
            <div className="dashboard-card-value">
              {metrics.tests_completed_last_7 || 0} tests · {metrics.todos_completed_last_7 || 0} todos
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-title">At risk opportunities</div>
        <div className="dashboard-list">
          {atRisk.map((item) => (
            <button
              key={item.opportunity_id}
              type="button"
              className="dashboard-list-item"
              onClick={() => onOpenOpportunity?.(`opportunity:${item.opportunity_id}`)}
            >
              <span>{item.opportunity_title || 'Opportunity'}</span>
              <span className="dashboard-pill">{item.unvalidated_count || 0} open</span>
            </button>
          ))}
          {atRisk.length === 0 && <div className="dashboard-empty">No at-risk opportunities.</div>}
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
