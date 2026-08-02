import React from 'react';
import { MessageSquare, Calculator, Globe, Shield, Mic, RefreshCw, Building2 } from 'lucide-react';
import { NavItem } from './ui/NavItem.tsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'chat', label: 'Aura Chat', icon: MessageSquare },
    { id: 'calculator', label: 'Carbon Tracker', icon: Calculator },
    { id: 'negotiate', label: 'Offset Bidding', icon: RefreshCw },
    { id: 'pulse', label: 'Climate Pulse', icon: Globe },
    { id: 'enterprise', label: 'Enterprise Sentinel', icon: Building2 },
    { id: 'voice', label: 'Eco Voice', icon: Mic },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container" style={{ display: 'flex', justifyContent: 'center', padding: '16px 12px', borderBottom: '1px solid var(--border-glass)' }}>
        <img 
          src="/logo.png" 
          alt="EcoPulse Logo" 
          className="pulse-logo"
          style={{ width: '100%', maxWidth: '140px', height: 'auto', borderRadius: '8px' }} 
        />
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavItem
              key={item.id}
              label={item.label}
              active={activeTab === item.id}
              icon={<Icon size={20} />}
              onClick={() => setActiveTab(item.id)}
            />
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
          <Shield size={12} color="#10b981" />
          <span>Google ADK & MCP</span>
        </div>
        <span>v2.0.0 Enterprise &copy; 2026</span>
      </div>
    </aside>
  );
};

export default Sidebar;
