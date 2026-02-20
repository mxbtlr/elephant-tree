import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import './BetaWelcomePopup.css';

const STORAGE_KEY = 'treeflow:betaWelcomeSeen';

function BetaWelcomePopup({ user, hideWhenOnboardingOpen }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || hideWhenOnboardingOpen) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, [user, hideWhenOnboardingOpen]);

  const handleContinue = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="beta-welcome-overlay" role="dialog" aria-labelledby="beta-welcome-title" aria-modal="true">
      <div className="beta-welcome-card">
        <h2 id="beta-welcome-title" className="beta-welcome-title">Welcome to TreeFlow Beta</h2>
        <p className="beta-welcome-body">
          We&apos;re still improving things. Thanks for being an early user — your feedback shapes what we build next.
        </p>
        <button type="button" className="beta-welcome-cta" onClick={handleContinue}>
          Got it
        </button>
      </div>
    </div>
  );
}

export default BetaWelcomePopup;
