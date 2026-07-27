import React from 'react';

interface NavItemProps {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({
  label,
  active,
  icon,
  onClick
}) => {
  return (
    <button 
      onClick={onClick}
      className={`sidebar-nav-item ${active ? 'active' : ''}`}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: active ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
        border: active ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
        color: active ? 'var(--primary-emerald)' : 'var(--text-muted)',
        cursor: 'pointer',
        fontWeight: active ? 600 : 500,
        fontSize: '14px',
        transition: 'all 0.15s ease-in-out',
        textAlign: 'left'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};
