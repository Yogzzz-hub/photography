import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useVaultStore } from './stores/useVaultStore';

if (import.meta.env.DEV) {
  (window as unknown as { __vaultStore: typeof useVaultStore }).__vaultStore = useVaultStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
