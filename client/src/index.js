import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { OstStoreProvider } from './store/useOstStore';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <OstStoreProvider>
      <App />
    </OstStoreProvider>
  </React.StrictMode>
);






