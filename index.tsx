
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Critical: Could not find root element to mount to");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("React Mounting Error:", err);
    // Fallback UI in case of total crash
    rootElement.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: #2A0114; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
        <div>
          <h1 style="color: #D4AF37;">WISE Portal</h1>
          <p>เกิดข้อผิดพลาดในการโหลดระบบ กรุณาลองใหม่อีกครั้ง</p>
          <button onclick="window.location.reload()" style="background: #D4AF37; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; color: #2A0114; font-weight: bold;">
            รีโหลดหน้าเว็บ
          </button>
        </div>
      </div>
    `;
  }
};

mountApp();
