import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [],
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE || "development",
});

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
