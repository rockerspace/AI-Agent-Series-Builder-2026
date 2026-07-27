import React, { useRef } from 'react';
import { Send, Paperclip } from 'lucide-react';

interface ChatInputProps {
  value: string;
  disabled: boolean;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileUpload: (file: File) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  disabled,
  onChange,
  onSubmit,
  onFileUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <form className="chat-input-wrapper" onSubmit={onSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.json,.csv,.pdf"
        style={{ display: 'none' }}
      />
      <button 
        type="button" 
        onClick={() => fileInputRef.current?.click()}
        className="chat-upload-btn"
        style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="Upload Utility Bill"
      >
        <Paperclip size={18} />
      </button>
      <input 
        type="text" 
        className="chat-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask EcoPulse, or upload a utility bill file to parse footprint..."
        disabled={disabled}
      />
      <button 
        type="submit" 
        className="chat-send-btn"
        disabled={disabled || !value.trim()}
      >
        <Send size={18} />
      </button>
    </form>
  );
};
