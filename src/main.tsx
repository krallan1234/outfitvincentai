import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global safety: ensure no stale service worker caches cause mixed React versions
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
}
if ('caches' in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}

createRoot(document.getElementById("root")!).render(<App />);
