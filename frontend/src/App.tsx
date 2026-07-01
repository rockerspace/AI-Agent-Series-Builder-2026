import React, { useState } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Chat from './components/Chat.tsx';
import Dashboard from './components/Dashboard.tsx';
import Pulse from './components/Pulse.tsx';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('chat');

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'chat':
        return 'Aura AI Agent Chat';
      case 'calculator':
        return 'Personal Carbon Footprint Tracker';
      case 'pulse':
        return 'Global Ecological Pulse & Policies';
      default:
        return 'EcoPulse';
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Pane */}
      <main className="main-content">
        <header className="content-header">
          <div className="header-title">
            <h1>{getHeaderTitle()}</h1>
          </div>
          <div className="header-status">
            <span className="status-dot"></span>
            <span>EcoPulse Server Connected</span>
          </div>
        </header>

        {/* Tab Body Rendering */}
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'calculator' && <Dashboard />}
        {activeTab === 'pulse' && <Pulse />}
      </main>
    </div>
  );
};

export default App;
