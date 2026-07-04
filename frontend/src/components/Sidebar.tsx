import React from 'react';
import { MessageSquare, Calculator, Globe, Shield, Sparkles, Mic } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'chat', label: 'Aura Chat', icon: MessageSquare },
    { id: 'calculator', label: 'Carbon Tracker', icon: Calculator },
    { id: 'pulse', label: 'Climate Pulse', icon: Globe },
    { id: 'voice', label: 'Eco Voice', icon: Mic },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">
          <Sparkles size={18} fill="#070a13" />
        </div>
        <span className="logo-text">EcoPulse</span>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
          <Shield size={12} color="#10b981" />
          <span>Google ADK & MCP</span>
        </div>
        <span>v1.0.0 &copy; 2026</span>
      </div>
    </aside>
  );
};

export default Sidebar;
