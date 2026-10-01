import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { AuthProvider } from "./context/AuthContext.js";
import "./index.css";
import { LanguageProvider } from "./context/LanguageContext.js";
import "./refresh.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
