import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  loading: boolean;
  onChange: (val: string) => void;
  onSearch: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  loading,
  onChange,
  onSearch
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="search-box" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
      <input 
        type="text" 
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search climate metrics by city or country (e.g., London, India, Tokyo, United States)..."
        style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-main)', fontSize: '14px' }}
      />
      <button 
        onClick={onSearch}
        className="btn-search"
        disabled={loading}
        style={{ background: 'var(--primary-cyan)', color: '#000', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <Search size={18} />
        {loading ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
};
