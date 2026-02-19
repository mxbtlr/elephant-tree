import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getNodeKey } from '../lib/ostTypes';
import { UNASSIGNED_STAGE_ID } from '../lib/journeyStages';
import './OnboardingFlow.css';

const STORAGE_KEY = 'treeflow:onboarding_completed';
const TOTAL_STEPS = 4;

const STEP_1 = {
  headline: 'Start with a clear Outcome',
  body: 'An Outcome defines the strategic result you want to achieve. Everything else connects to this.',
  cta: 'Create Outcome'
};

const STEP_2 = {
  headline: 'Break it into Opportunities',
  body: 'Opportunities describe user problems or growth levers. Think: Where is the friction? Where is the upside?',
  cta: 'Add Opportunity'
};

const STEP_3 = {
  headline: 'Propose a Solution',
  body: 'Solutions are bets. They should be testable. Don\'t overthink — you can refine later.',
  cta: 'Add Solution'
};

const STEP_4 = {
  headline: 'Test with Experiments',
  body: 'Experiments validate or invalidate your ideas. TreeFlow connects strategy to evidence.',
  cta: 'Add Experiment'
};

const STEPS = [STEP_1, STEP_2, STEP_3, STEP_4];

const OUTCOME_PREFILL = 'Increase weekly active usage by 20%';
const OPPORTUNITY_PREFILL = 'Low engagement in first week';
const SOLUTION_PREFILL = 'In-app 7-day habit checklist';
const TEST_PREFILL = 'A/B test: checklist vs control on activation';

export function getOnboardingCompleted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, 'true');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function shouldShowOnboarding(outcomes) {
  if (getOnboardingCompleted()) return false;
  const count = Array.isArray(outcomes) ? outcomes.length : 0;
  return count === 0;
}

function getFirstOutcomeKey(outcomes) {
  const o = outcomes?.[0];
  return o ? getNodeKey('outcome', o.id) : null;
}

function getFirstOpportunityKey(outcomes) {
  const o = outcomes?.[0];
  const opps = o?.opportunities;
  const first = Array.isArray(opps) ? opps[0] : null;
  return first ? getNodeKey('opportunity', first.id) : null;
}

function getFirstSolutionKey(outcomes) {
  const o = outcomes?.[0];
  const opps = o?.opportunities;
  const firstOpp = Array.isArray(opps) ? opps[0] : null;
  const sols = firstOpp?.solutions;
  const firstSol = Array.isArray(sols) ? sols[0] : null;
  return firstSol ? getNodeKey('solution', firstSol.id) : null;
}

function getUnassignedJourneyKey(outcomes) {
  const o = outcomes?.[0];
  if (!o?.id) return null;
  return `journey:${o.id}:${UNASSIGNED_STAGE_ID}`;
}

function countOpportunities(outcomes) {
  const o = outcomes?.[0];
  const opps = o?.opportunities;
  return Array.isArray(opps) ? opps.length : 0;
}

function countSolutions(outcomes) {
  const o = outcomes?.[0];
  const opps = o?.opportunities;
  const firstOpp = Array.isArray(opps) ? opps[0] : null;
  const sols = firstOpp?.solutions;
  return Array.isArray(sols) ? sols.length : 0;
}

function countTests(outcomes) {
  const o = outcomes?.[0];
  const opps = o?.opportunities;
  const firstOpp = Array.isArray(opps) ? opps[0] : null;
  const sols = firstOpp?.solutions;
  const firstSol = Array.isArray(sols) ? sols[0] : null;
  const tests = firstSol?.tests;
  return Array.isArray(tests) ? tests.length : 0;
}

function OnboardingFlow({
  isOpen,
  onClose,
  outcomes = [],
  treeStructure = 'classic',
  onCreateOutcome,
  onUpdate,
  addOutcomeButtonRef
}) {
  const [step, setStep] = useState(1);
  const [showJourneyTip, setShowJourneyTip] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const panelRef = useRef(null);

  const outcomeCount = Array.isArray(outcomes) ? outcomes.length : 0;
  const oppCount = countOpportunities(outcomes);
  const solCount = countSolutions(outcomes);
  const testCount = countTests(outcomes);

  useEffect(() => {
    if (!isOpen) return;
    if (outcomeCount >= 1 && step === 1) setStep(2);
    if (oppCount >= 1 && step === 2) {
      setStep(3);
      if (treeStructure === 'journey') setShowJourneyTip(true);
    }
    if (solCount >= 1 && step === 3) setStep(4);
    if (testCount >= 1 && step === 4) setShowSuccess(true);
  }, [isOpen, outcomeCount, oppCount, solCount, testCount, step, treeStructure]);

  useEffect(() => {
    if (!isOpen || step !== 1 || !addOutcomeButtonRef?.current) {
      setAnchorRect(null);
      return;
    }
    const el = addOutcomeButtonRef.current;
    let rafId = 0;
    const scheduleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        setAnchorRect(el.getBoundingClientRect());
      });
    };
    scheduleUpdate();
    const obs = new ResizeObserver(scheduleUpdate);
    obs.observe(el);
    window.addEventListener('scroll', scheduleUpdate, true);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      obs.disconnect();
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [isOpen, step, addOutcomeButtonRef]);

  const handleCta = () => {
    if (step === 1) {
      onCreateOutcome?.(OUTCOME_PREFILL);
      return;
    }
    if (step === 2) {
      const parentKey = treeStructure === 'journey' ? getUnassignedJourneyKey(outcomes) : getFirstOutcomeKey(outcomes);
      if (parentKey) onUpdate?.('add-child', { parentKey, childType: 'opportunity', initialTitle: OPPORTUNITY_PREFILL });
      return;
    }
    if (step === 3) {
      const parentKey = getFirstOpportunityKey(outcomes);
      if (parentKey) onUpdate?.('add-child', { parentKey, childType: 'solution', initialTitle: SOLUTION_PREFILL });
      return;
    }
    if (step === 4) {
      const parentKey = getFirstSolutionKey(outcomes);
      if (parentKey) onUpdate?.('add-child', { parentKey, childType: 'test', initialTitle: TEST_PREFILL });
    }
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    onClose?.();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    setOnboardingCompleted(true);
    onClose?.();
  };

  if (!isOpen) return null;

  const config = STEPS[step - 1];
  const isComplete = showSuccess;

  if (isComplete) {
    return createPortal(
      <div className="onboarding-flow onboarding-flow-success" ref={panelRef}>
        <div className="onboarding-flow-success-inner">
          <p className="onboarding-flow-success-text">You're ready. Now refine, test, and build momentum.</p>
          <button type="button" className="onboarding-flow-btn onboarding-flow-btn-primary" onClick={handleComplete}>
            Explore TreeFlow
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <>
      {step === 1 && anchorRect && (
        <div
          className="onboarding-flow-spotlight"
          style={{
            top: anchorRect.top - 6,
            left: anchorRect.left - 6,
            width: anchorRect.width + 12,
            height: anchorRect.height + 12
          }}
        />
      )}
      <div
        className="onboarding-flow-panel"
        ref={panelRef}
        style={
          step === 1 && anchorRect
            ? { position: 'fixed', top: anchorRect.bottom + 12, left: anchorRect.left, right: 'auto', maxWidth: 360 }
            : {}
        }
      >
        <div className="onboarding-flow-progress">
          Step {step} of {TOTAL_STEPS}
        </div>
        <h3 className="onboarding-flow-headline">{config.headline}</h3>
        <p className="onboarding-flow-body">{config.body}</p>
        {showJourneyTip && step === 3 && (
          <p className="onboarding-flow-tip">
            Journey stages help you think across the full customer lifecycle. You can switch between Classic and Journey anytime.
          </p>
        )}
        <div className="onboarding-flow-actions">
          <button type="button" className="onboarding-flow-btn onboarding-flow-btn-primary" onClick={handleCta}>
            {config.cta}
          </button>
          <div className="onboarding-flow-actions-secondary">
            {step > 1 && (
              <button type="button" className="onboarding-flow-btn onboarding-flow-btn-ghost" onClick={handleBack}>
                Back
              </button>
            )}
            <button type="button" className="onboarding-flow-btn onboarding-flow-btn-ghost" onClick={handleSkip}>
              Skip
            </button>
            <button type="button" className="onboarding-flow-btn onboarding-flow-btn-ghost" onClick={onClose} aria-label="Close">
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export default OnboardingFlow;
