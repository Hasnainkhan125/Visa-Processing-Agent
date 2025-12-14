// src/App.jsx
import React from 'react';
import Chatbot from './components/Chatbot'; // ✅ default import
import PaymentForm from './components/PaymentForm'; // ✅ add PaymentForm
import './App.css';

const App = () => {
  return (
    <div style={{ padding: 0 }}>
      
      {/* Chatbot Section */}
      <div style={{ marginBottom: -20 }}>
        <Chatbot />
      </div>

    </div>
  );
};

export default App;




