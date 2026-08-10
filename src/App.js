import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import BlotterPageRest from "./components/BlotterPageRest";
import BlotterPageStream from "./components/BlotterPageStream";

export default function App() {
  return (
    <Router>
      <div style={{ padding: 16 }}>
        <h2>📊 Blotter Application</h2>

        {/* 🔹 Navigation Bar */}
        <nav style={{ marginBottom: 20 }}>
          <Link to="/blotter-rest" style={{ marginRight: 12 }}>🔁 REST Blotter</Link>
          <Link to="/blotter-stream">⚡ Streaming Blotter</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Navigate to="/blotter-rest" />} />
          <Route path="/blotter-rest" element={<BlotterPageRest />} />
          <Route path="/blotter-stream" element={<BlotterPageStream />} />
        </Routes>
      </div>
    </Router>
  );
}
