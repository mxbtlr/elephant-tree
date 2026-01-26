export const TEST_TEMPLATES = [
  {
    key: 'customer_interview',
    label: 'Customer Interview',
    defaultTitle: 'Customer Interview',
    successCriteria: {
      pass: '≥5 interviews confirm the pain is urgent and frequent.',
      iterate: 'Mixed signal on urgency; refine segment and retry.',
      kill: 'Interviews show low urgency or no real pain.'
    },
    timeboxDays: 5,
    checklist: [
      'What is the current workaround?',
      'How often does this problem occur?',
      'Would you pay to solve it?'
    ]
  },
  {
    key: 'cold_outreach',
    label: 'Cold Outreach',
    defaultTitle: 'Cold Outreach Test',
    successCriteria: {
      pass: '≥10% reply rate with ≥3 positive problem confirmations.',
      iterate: 'Reply rate 5–10% or low intent; refine message.',
      kill: 'Reply rate <5% and no confirmations.'
    },
    timeboxDays: 7,
    checklist: ['Open rate', 'Reply rate', 'Positive confirmation count']
  },
  {
    key: 'landing_page_smoke',
    label: 'Landing Page Smoke Test',
    defaultTitle: 'Landing Page Smoke Test',
    successCriteria: {
      pass: '≥5% conversion to waitlist with ≥50 visits.',
      iterate: '2–5% conversion; iterate copy and CTA.',
      kill: '<2% conversion after 50+ visits.'
    },
    timeboxDays: 7,
    checklist: ['Unique visitors', 'Conversion rate', 'CTA clicks']
  },
  {
    key: 'pricing_test',
    label: 'Pricing Test',
    defaultTitle: 'Pricing Test',
    successCriteria: {
      pass: '≥3 users accept target price point.',
      iterate: 'Interest but price too high; test alternative.',
      kill: 'No one accepts target price.'
    },
    timeboxDays: 5,
    checklist: ['Price point tested', 'Acceptance count', 'Objections']
  },
  {
    key: 'prototype_usability',
    label: 'Prototype Usability Test',
    defaultTitle: 'Prototype Usability Test',
    successCriteria: {
      pass: '≥70% task success without guidance.',
      iterate: '50–70% success; refine UX and retry.',
      kill: '<50% task success.'
    },
    timeboxDays: 7,
    checklist: ['Task success rate', 'Top confusion points', 'Time to complete']
  },
  {
    key: 'concierge_mvp',
    label: 'Concierge MVP',
    defaultTitle: 'Concierge MVP',
    successCriteria: {
      pass: '≥3 users complete workflow manually with satisfaction.',
      iterate: 'Users complete but friction high; simplify.',
      kill: 'Users drop off before completing.'
    },
    timeboxDays: 10,
    checklist: ['Completion rate', 'Satisfaction signal', 'Manual effort']
  }
];

export const getTemplateByKey = (key) => TEST_TEMPLATES.find((t) => t.key === key);
