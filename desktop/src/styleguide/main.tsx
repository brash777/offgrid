import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import { Styleguide } from './Styleguide';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <Styleguide />
    </StrictMode>,
  );
}
