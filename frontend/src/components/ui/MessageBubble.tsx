import React from 'react';
import { Sparkles, User } from 'lucide-react';

interface MessageBubbleProps {
  sender: 'user' | 'agent';
  children: React.ReactNode;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ sender, children }) => {
  const isAgent = sender === 'agent';
  return (
    <div className={`message-wrapper ${sender}`} style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexDirection: isAgent ? 'row' : 'row-reverse' }}>
      <div 
        className={`${isAgent ? 'agent' : 'user'}-avatar`} 
        style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '50%', 
          background: isAgent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)', 
          border: isAgent ? '1px solid #10b981' : '1px solid #06b6d4', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: isAgent ? '#10b981' : '#06b6d4'
        }}
      >
        {isAgent ? <Sparkles size={14} /> : <User size={14} />}
      </div>
      <div 
        className={`message-bubble ${sender}`} 
        style={{ 
          maxWidth: '80%', 
          padding: '12px 16px', 
          borderRadius: '12px', 
          background: isAgent ? 'var(--bg-glass)' : 'rgba(6, 182, 212, 0.1)', 
          border: isAgent ? '1px solid var(--border-glass)' : '1px solid rgba(6, 182, 212, 0.2)',
          color: '#fff',
          fontSize: '14.5px',
          lineHeight: 1.5
        }}
      >
        {children}
      </div>
    </div>
  );
};
