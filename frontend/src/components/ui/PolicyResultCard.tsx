import React from 'react';
import { Globe } from 'lucide-react';

interface PolicyResultCardProps {
  country: string;
  netZeroYear: string;
  carbonIntensity: string;
  policies: string[];
  incentives: string;
}

export const PolicyResultCard: React.FC<PolicyResultCardProps> = ({
  country,
  netZeroYear,
  carbonIntensity,
  policies,
  incentives
}) => {
  return (
    <div className="glass-card policy-summary-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
        <Globe size={18} color="var(--primary-cyan)" /> {country} Net-Zero & Regulatory Mandates
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Net-Zero Commitment Target</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-cyan)', marginTop: '4px' }}>{netZeroYear}</div>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Grid Carbon Density</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '6px' }}>{carbonIntensity}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>Key Policy Mandates:</span>
          <ul style={{ listStyleType: 'disc', marginLeft: '20px', marginTop: '6px', color: 'var(--text-muted)' }}>
            {policies.map((pol, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{pol}</li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: '4px' }}>
          <span style={{ color: 'var(--text-dim)' }}>Active Financial Incentives:</span>
          <p style={{ margin: '4px 0 0 0', color: '#86efac', fontWeight: 500 }}>{incentives}</p>
        </div>
      </div>
    </div>
  );
};
