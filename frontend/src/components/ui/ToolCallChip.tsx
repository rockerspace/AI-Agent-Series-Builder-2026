import React from 'react';
import { Terminal } from 'lucide-react';

interface ToolCallChipProps {
  toolName: string;
}

export const ToolCallChip: React.FC<ToolCallChipProps> = ({ toolName }) => {
  return (
    <div 
      className="tool-call-indicator" 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '8px',
        background: 'rgba(250, 204, 21, 0.08)',
        border: '1px solid rgba(250, 204, 21, 0.3)',
        color: '#facc15',
        fontSize: '12px',
        fontWeight: 600,
        margin: '8px 0',
        fontFamily: 'monospace'
      }}
    >
      <Terminal size={14} className="animate-pulse" />
      <span>MCP Server executing: {toolName}()</span>
    </div>
  );
};
