import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { restoreFontScale } from './utils/fontScale';
import { registerServiceWorker } from './services/messaging';

// Khôi phục preference cỡ chữ (M08) trước lần render đầu
restoreFontScale();

// Đăng ký Service Worker — cần cho Web Push (FCM) kể cả khi trang đóng (xem public/sw.js)
window.addEventListener('load', () => {
  void registerServiceWorker();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
