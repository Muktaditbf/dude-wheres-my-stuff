// Must load first: catches the browser's one-time "you can install this app" event.
import './lib/install';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/permanent-marker';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initAutoBackup } from './lib/autobackup';
import { applyTheme, getSettings } from './lib/settings';

applyTheme(getSettings().theme);
void initAutoBackup();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
