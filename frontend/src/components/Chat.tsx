import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Terminal, ThumbsUp, ThumbsDown, Copy, Check, Paperclip } from 'lucide-react';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  feedback?: 'up' | 'down' | null;
}

const SUGGESTION_CHIPS = [
  '🌆 Check Mumbai air quality & climate trend',
  '🚗 Calculate my carbon footprint for 300km car, 150kWh, 10 meals',
  '⚡ EV incentives and Net Zero targets in India',
  '🌡️ What is the warming trend in New York?',
  '🌳 How many trees offset 2 tonnes of CO2?',
  '🔋 Green energy subsidies in Germany',
];

// Simple regex-based markdown parser
const renderMarkdown = (text: string) => {
  if (!text) return null;

  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let inList = false;
  let listItems: string[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-${key}`} style={{ marginLeft: '24px', marginBottom: '12px', listStyleType: 'disc' }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '4px' }}>{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = (key: number) => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      renderedElements.push(
        <div key={`table-container-${key}`} style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                {tableHeaders.map((header, idx) => (
                  <th key={idx} style={{ padding: '10px 14px', border: '1px solid var(--border-glass)', textAlign: 'left', fontWeight: 600 }}>
                    {parseInlineMarkdown(header.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '10px 14px', border: '1px solid var(--border-glass)' }}>
                      {parseInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  const parseInlineMarkdown = (str: string): React.ReactNode => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(str)) !== null) {
      if (match.index > lastIndex) parts.push(str.substring(lastIndex, match.index));
      parts.push(<strong key={match.index} style={{ color: 'var(--primary-emerald)', fontWeight: 600 }}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    if (lastIndex < str.length) parts.push(str.substring(lastIndex));
    return parts.length > 0 ? <>{parts}</> : str;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('|')) {
      flushList(i);
      inTable = true;
      const cells = line.split('|').slice(1, -1);
      if (cells.every(c => c.trim().startsWith('-'))) continue;
      if (tableHeaders.length === 0) tableHeaders = cells;
      else tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      inList = true;
      listItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    } else if (inList) {
      flushList(i);
    }

    if (line.startsWith('### ')) {
      renderedElements.push(<h3 key={i} style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '14px 0 8px 0' }}>{parseInlineMarkdown(line.substring(4))}</h3>);
    } else if (line.startsWith('## ')) {
      renderedElements.push(<h2 key={i} style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary-cyan)', margin: '18px 0 10px 0' }}>{parseInlineMarkdown(line.substring(3))}</h2>);
    } else if (line.startsWith('# ')) {
      renderedElements.push(<h1 key={i} style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary-emerald)', margin: '22px 0 12px 0' }}>{parseInlineMarkdown(line.substring(2))}</h1>);
    } else if (line.trim() === '') {
      renderedElements.push(<div key={i} style={{ height: '8px' }} />);
    } else {
      renderedElements.push(<p key={i} style={{ marginBottom: '8px', color: 'var(--text-main)', fontSize: '14.5px' }}>{parseInlineMarkdown(line)}</p>);
    }
  }

  flushList(lines.length);
  flushTable(lines.length);

  return <div className="markdown-response">{renderedElements}</div>;
};

// Animated typing indicator (3 bouncing dots)
const TypingIndicator: React.FC = () => (
  <div className="typing-indicator">
    <span className="typing-dot" style={{ animationDelay: '0ms' }} />
    <span className="typing-dot" style={{ animationDelay: '160ms' }} />
    <span className="typing-dot" style={{ animationDelay: '320ms' }} />
  </div>
);

// Message action bar: feedback + copy
const MessageActions: React.FC<{
  text: string;
  feedback: 'up' | 'down' | null | undefined;
  onFeedback: (val: 'up' | 'down') => void;
}> = ({ text, feedback, onFeedback }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="message-actions">
      <button
        className={`action-btn ${feedback === 'up' ? 'active-up' : ''}`}
        onClick={() => onFeedback('up')}
        title="Helpful"
      >
        <ThumbsUp size={13} />
      </button>
      <button
        className={`action-btn ${feedback === 'down' ? 'active-down' : ''}`}
        onClick={() => onFeedback('down')}
        title="Not helpful"
      >
        <ThumbsDown size={13} />
      </button>
      <button className="action-btn copy-btn" onClick={handleCopy} title="Copy response">
        {copied ? <Check size={13} style={{ color: 'var(--primary-emerald)' }} /> : <Copy size={13} />}
      </button>
    </div>
  );
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'agent',
      text: '# Welcome to EcoPulse!\n\nI am your agentic **Climate & Ecological Assistant**, powered by Gemini and the Google AI stack. I can execute live calculations, inspect air quality metrics, and lookup carbon offset strategies using Model Context Protocol (MCP).\n\nTry one of the suggestions below or ask me anything about climate!',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolCall, setToolCall] = useState<string | null>(null);
  const [showChips, setShowChips] = useState(true);
  const [slowResponse, setSlowResponse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, toolCall]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    setShowChips(false);
    setMessages(prev => [...prev, { sender: 'user', text: `📁 Uploaded Utility Bill: **${file.name}**` }]);
    setLoading(true);
    setToolCall(null);
    setSlowResponse(false);
    setMessages(prev => [...prev, { sender: 'agent', text: '' }]);

    const slowTimer = setTimeout(() => setSlowResponse(true), 10000);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/api/upload-bill?session_id=ecopulse_session`, {
        method: 'POST',
        body: formData,
      });

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payloadStr = line.replace('data: ', '').trim();
              if (payloadStr === '[DONE]') { done = true; break; }

              try {
                const data = JSON.parse(payloadStr);
                if (data.type === 'text') {
                  setToolCall(null);
                  setMessages(prev => {
                    const next = [...prev];
                    const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
                    if (lastAgentIdx !== -1) next[lastAgentIdx] = { ...next[lastAgentIdx], text: next[lastAgentIdx].text + data.content };
                    return next;
                  });
                } else if (data.type === 'tool') {
                  setToolCall(data.content);
                } else if (data.type === 'error') {
                  setMessages(prev => {
                    const next = [...prev];
                    const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
                    if (lastAgentIdx !== -1) next[lastAgentIdx] = { ...next[lastAgentIdx], text: `Error: ${data.content}` };
                    return next;
                  });
                }
              } catch (e) { console.error('Error parsing SSE chunk:', e); }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during bill upload:', error);
      setMessages(prev => {
        const next = [...prev];
        const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
        if (lastAgentIdx !== -1) next[lastAgentIdx] = { ...next[lastAgentIdx], text: 'I encountered a communication error with the EcoPulse backend. Please verify that the FastAPI backend server is running.' };
        return next;
      });
    } finally {
      setLoading(false);
      setToolCall(null);
      setSlowResponse(false);
      clearTimeout(slowTimer);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setShowChips(false);
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setLoading(true);
    setToolCall(null);
    setSlowResponse(false);
    setMessages(prev => [...prev, { sender: 'agent', text: '' }]);

    // Show a wake-up warning after 10s (Render cold start)
    const slowTimer = setTimeout(() => setSlowResponse(true), 10000);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: 'ecopulse_session', user_id: 'default_user' }),
      });

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payloadStr = line.replace('data: ', '').trim();
              if (payloadStr === '[DONE]') { done = true; break; }

              try {
                const data = JSON.parse(payloadStr);
                if (data.type === 'text') {
                  setToolCall(null);
                  setMessages(prev => {
                    const next = [...prev];
                    const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
                    if (lastAgentIdx !== -1) next[lastAgentIdx] = { ...next[lastAgentIdx], text: next[lastAgentIdx].text + data.content };
                    return next;
                  });
                } else if (data.type === 'tool') {
                  setToolCall(data.content);
                } else if (data.type === 'error') {
                  setMessages(prev => {
                    const next = [...prev];
                    const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
                    if (lastAgentIdx !== -1) next[lastAgentIdx] = { ...next[lastAgentIdx], text: `Error: ${data.content}` };
                    return next;
                  });
                }
              } catch (e) { console.error('Error parsing SSE chunk:', e); }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during chat send:', error);
      setMessages(prev => {
        const next = [...prev];
        const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
        if (lastAgentIdx !== -1) next[lastAgentIdx] = { ...next[lastAgentIdx], text: 'I encountered a communication error with the EcoPulse backend. Please verify that the FastAPI backend server is running.' };
        return next;
      });
    } finally {
      setLoading(false);
      setToolCall(null);
      setSlowResponse(false);
      clearTimeout(slowTimer);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleFeedback = (index: number, val: 'up' | 'down') => {
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, feedback: val } : m));
  };

  return (
    <div className="chat-container">
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message-wrapper ${msg.sender}`}>
            {msg.sender === 'agent' && (
              <div className="agent-avatar">
                <Sparkles size={14} />
              </div>
            )}
            <div className={`message-bubble ${msg.sender}`}>
              {msg.sender === 'agent' ? (
                msg.text
                  ? renderMarkdown(msg.text)
                  : <TypingIndicator />
              ) : (
                msg.text
              )}

              {/* Suggestion chips only after first agent message */}
              {msg.sender === 'agent' && index === 0 && showChips && (
                <div className="suggestion-chips">
                  {SUGGESTION_CHIPS.map((chip, i) => (
                    <button key={i} className="chip" onClick={() => sendMessage(chip)}>
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Message actions for agent messages with content */}
            {msg.sender === 'agent' && msg.text && index !== 0 && (
              <MessageActions
                text={msg.text}
                feedback={msg.feedback}
                onFeedback={(val) => handleFeedback(index, val)}
              />
            )}
          </div>
        ))}

        {toolCall && (
          <div className="tool-chip">
            <Terminal size={14} />
            <span>{toolCall}</span>
          </div>
        )}
        {slowResponse && loading && (
          <div className="wake-up-banner">
            ⏳ The backend is waking up from sleep (Render free tier).
            This takes ~30 seconds on first request. Please wait...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".txt,.json,.csv,.pdf" 
          style={{ display: 'none' }} 
        />
        <button 
          type="button" 
          className="chat-upload-btn" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={loading}
          title="Upload Utility Bill"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s'
          }}
        >
          <Paperclip size={18} />
        </button>
        <input
          type="text"
          className="chat-input"
          placeholder="Ask EcoPulse, or upload a utility bill file to parse footprint..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
          <Send size={18} fill={loading || !input.trim() ? 'transparent' : '#070a13'} />
        </button>
      </form>
    </div>
  );
};

export default Chat;
