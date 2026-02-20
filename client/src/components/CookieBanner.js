import React, { useEffect, useState } from 'react';
import './CookieBanner.css';

const CONSENT_KEY = 'treeflow:cookieConsent';
const CLARITY_ID = 'vkbpo2g39r';

function loadClarity() {
  if (typeof window === 'undefined' || document.getElementById('clarity-script')) return;
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r);
    t.async = 1;
    t.id = 'clarity-script';
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'true') {
      loadClarity();
      return;
    }
    setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    loadClarity();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <p className="cookie-banner-text">
        We use cookies and Microsoft Clarity to improve TreeFlow.
      </p>
      <button type="button" className="cookie-banner-accept" onClick={handleAccept}>
        Accept
      </button>
    </div>
  );
}

export default CookieBanner;
