import React from 'react';
import { createRoot } from 'react-dom/client'; // Changed import
import App from './components/App';
import './styles.css'; // Optional: if you add a CSS file

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement); // Use createRoot directly
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
