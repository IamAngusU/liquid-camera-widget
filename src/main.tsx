import "@fontsource-variable/manrope";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

document.documentElement.dataset.runtime = window.luma ? "electron" : "web";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
