import React from 'react';

interface CarbonSliderCardProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  description: string;
  onChange: (val: number) => void;
}

export const CarbonSliderCard: React.FC<CarbonSliderCardProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  description,
  onChange
}) => {
  return (
    <div className="form-group" style={{ marginTop: '20px' }}>
      <div className="slider-val" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
        <label>{label}</label>
        <span style={{ color: 'var(--primary-cyan)' }}>{value} {unit}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))} 
        style={{ width: '100%', accentColor: 'var(--primary-cyan)', cursor: 'pointer' }}
      />
      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
        {description}
      </span>
    </div>
  );
};
