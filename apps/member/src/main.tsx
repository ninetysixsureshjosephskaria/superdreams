import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

import '@fontsource-variable/inter';
import '@/styles/globals.css';

// Recover from stale lazy chunks after a redeploy. Vite fires `vite:preloadError`
// when a dynamically-imported chunk 404s because its content hash no longer
// exists on the server (a client still running a previous deploy's bundle). A
// single hard reload picks up the current index.html + chunk hashes. The 10s
// window prevents a reload loop if the chunk is genuinely unavailable.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'sd:last-preload-reload';
  const now = Date.now();
  const last = Number(window.sessionStorage.getItem(KEY) ?? '0');
  if (now - last < 10_000) return;
  window.sessionStorage.setItem(KEY, String(now));
  window.location.reload();
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element "#root" was not found.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
