import React from "react";
import ReactDOM from "react-dom/client";
import { CopilotKit } from "@copilotkit/react-core";
import App from "./index.tsx";

const apiKey = import.meta.env.VITE_COPILOTKIT_AI_PUBLIC_API_KEY as string;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CopilotKit publicApiKey={apiKey}>
      <App />
    </CopilotKit>
  </React.StrictMode>
);
