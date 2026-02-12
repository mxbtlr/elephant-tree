import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { OstStoreProvider } from './store/useOstStore';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 640, color: '#333' }}>
          <h1 style={{ color: '#c00' }}>Something went wrong</h1>
          <pre style={{ overflow: 'auto', background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
            {this.state.error.message}
          </pre>
          <p style={{ color: '#666' }}>Check the browser console for full details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <OstStoreProvider>
        <App />
      </OstStoreProvider>
    </ErrorBoundary>
  </React.StrictMode>
);






