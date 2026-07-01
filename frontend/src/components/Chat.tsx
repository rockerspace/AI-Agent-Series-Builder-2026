import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Terminal } from 'lucide-react';

interface Message {
  sender: 'user' | 'agent';
  text: string;
}

// Simple regex-based markdown parser to display bullet points, bold text, lists, and tables beautifully
const renderMarkdown = (text: string) => {
  if (!text) return null;

  // Split lines
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

  const parseInlineMarkdown = (str: string) => {
    // Bold **text**
    const boldRegex = /\*\*(.*?)\*\*/g;
    let parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} style={{ color: 'var(--primary-emerald)', fontWeight: 600 }}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : str;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle Tables
    if (line.trim().startsWith('|')) {
      flushList(i);
      inTable = true;
      const cells = line.split('|').slice(1, -1);
      
      // Check if separator line
      if (cells.every(c => c.trim().startsWith('-'))) {
        continue;
      }
      
      if (tableHeaders.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // Handle bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      inList = true;
      listItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    } else if (inList) {
      flushList(i);
    }

    // Handle Headers
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

  // Flush remaining lists or tables
  flushList(lines.length);
  flushTable(lines.length);

  return <div className="markdown-response">{renderedElements}</div>;
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'agent', text: '# Welcome to EcoPulse!\n\nI am your agentic **Climate & Ecological Assistant**, powered by Gemini and the Google AI stack. I can execute live calculations, inspect air quality metrics, and lookup carbon offset strategies using Model Context Protocol (MCP).\n\nAsk me something like:\n- *"What is the climate trend and renewable energy percentage in Bengaluru?"*\n- *"Calculate my carbon footprint for traveling 500 km by car, 200 kWh electricity, and eating 15 meat meals."*\n- *"What are the green EV incentives and Net Zero targets in the United States?"*' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolCall, setToolCall] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, toolCall]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setLoading(true);
    setToolCall(null);

    // Placeholder agent response to build streaming text on
    setMessages(prev => [...prev, { sender: 'agent', text: '' }]);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: 'ecopulse_session',
          user_id: 'default_user'
        }),
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          
          // Split buffer by SSE format (data: ...)
          const lines = buffer.split('\n\n');
          // Save the last partial block back to the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payloadStr = line.replace('data: ', '').trim();
              
              if (payloadStr === '[DONE]') {
                done = true;
                break;
              }

              try {
                const data = JSON.parse(payloadStr);
                
                if (data.type === 'text') {
                  setToolCall(null);
                  setMessages(prev => {
                    const next = [...prev];
                    const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
                    if (lastAgentIdx !== -1) {
                      next[lastAgentIdx].text += data.content;
                    }
                    return next;
                  });
                } else if (data.type === 'tool') {
                  setToolCall(data.content);
                } else if (data.type === 'error') {
                  setMessages(prev => {
                    const next = [...prev];
                    const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
                    if (lastAgentIdx !== -1) {
                      next[lastAgentIdx].text = `Error: ${data.content}`;
                    }
                    return next;
                  });
                }
              } catch (e) {
                console.error('Error parsing SSE chunk:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during chat send:', error);
      setMessages(prev => {
        const next = [...prev];
        const lastAgentIdx = next.map(m => m.sender).lastIndexOf('agent');
        if (lastAgentIdx !== -1) {
          next[lastAgentIdx].text = 'I encountered a communication error with the EcoPulse backend. Please verify that the FastAPI backend server is running.';
        }
        return next;
      });
    } finally {
      setLoading(false);
      setToolCall(null);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message-bubble ${msg.sender}`}>
            {msg.sender === 'agent' ? (
              msg.text ? renderMarkdown(msg.text) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} className="status-dot" />
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>EcoPulse is typing...</span>
                </div>
              )
            ) : (
              msg.text
            )}
          </div>
        ))}
        {toolCall && (
          <div className="tool-chip">
            <Terminal size={14} />
            <span>{toolCall}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-wrapper">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask EcoPulse about climate trends, footprints, or incentives..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
          <Send size={18} fill={loading || !input.trim() ? "transparent" : "#070a13"} />
        </button>
      </form>
    </div>
  );
};

export default Chat;
