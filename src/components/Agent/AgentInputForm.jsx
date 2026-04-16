import { useState } from 'react';
import { Search, Globe, Loader, AlertCircle } from 'lucide-react';

export default function AgentInputForm({ onSubmit, isRunning }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const val = input.trim();
    if (!val) { setError('Please enter a company name or URL.'); return; }
    onSubmit(val);
  };

  const suggestions = ['notion.so', 'linear.app', 'retool.com', 'Figma', 'Vercel'];

  return (
    <div style={{
      background: '#18181b', border: '1px solid #27272a',
      borderRadius: 12, padding: 20, marginBottom: 24,
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', margin: '0 0 12px' }}>
        New Lead Research
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Globe size={14} color="#52525b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            placeholder="Company name, website URL, or LinkedIn URL..."
            disabled={isRunning}
            style={{
              width: '100%', background: '#09090b', border: `1px solid ${error ? '#ef4444' : '#3f3f46'}`,
              borderRadius: 8, padding: '9px 12px 9px 34px',
              color: '#f4f4f5', fontSize: 13, outline: 'none',
              opacity: isRunning ? 0.6 : 1,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isRunning || !input.trim()}
          style={{
            background: isRunning ? '#27272a' : '#f59e0b',
            color: isRunning ? '#52525b' : '#09090b',
            border: 'none', borderRadius: 8, padding: '9px 18px',
            fontSize: 13, fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          {isRunning ? (
            <><Loader size={13} className="animate-spin-icon" /> Running...</>
          ) : (
            <><Search size={13} /> Research Lead</>
          )}
        </button>
      </form>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '8px 12px',
        }}>
          <AlertCircle size={13} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#3f3f46' }}>Try:</span>
        {suggestions.map(s => (
          <button key={s} onClick={() => setInput(s)} disabled={isRunning}
            style={{
              fontSize: 11, color: '#52525b', background: '#27272a',
              border: '1px solid #3f3f46', borderRadius: 4, padding: '2px 8px',
              cursor: 'pointer',
            }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
