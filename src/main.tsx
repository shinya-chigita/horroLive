import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppV2 from './AppV2';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found.');
}

createRoot(root).render(
  <StrictMode>
    <AppV2 />
  </StrictMode>,
);
