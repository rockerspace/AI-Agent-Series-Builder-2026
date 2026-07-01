import React, { useState, useEffect } from 'react';
import { Search, MapPin, Activity, Wind, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ClimateMetrics {
  location: string;
  temperature_anomaly: string;
  extreme_weather_risk_index: number;
  air_quality_index: number;
  clean_energy_percentage: number;
  forest_cover_change: string;
  primary_emitters: string;
  status?: string;
}

interface PolicyMetrics {
  country: string;
  net_zero_target_year: string;
  grid_carbon_intensity: string;
  core_policies: string[];
  active_incentives: string;
  status?: string;
}

const Pulse: React.FC = () => {
  const [search, setSearch] = useState('New York');
  const [metrics, setMetrics] = useState<ClimateMetrics | null>(null);
  const [policy, setPolicy] = useState<PolicyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch climate metrics
      const metricsRes = await fetch(`http://127.0.0.1:8000/api/metrics?location=${encodeURIComponent(search)}`);
      // 2. Fetch policies (try treating the search value as the country, fall back to United States if not specified)
      const policyRes = await fetch(`http://127.0.0.1:8000/api/policies?country=${encodeURIComponent(search)}`);
      
      if (metricsRes.ok && policyRes.ok) {
        const metricsData = await metricsRes.json();
        const policyData = await policyRes.json();
        setMetrics(metricsData);
        setPolicy(policyData);
      } else {
        throw new Error("Location metrics not found.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch location data. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Run initial search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  const getAqiClass = (aqi: number) => {
    if (aqi <= 50) return { label: 'Good', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (aqi <= 100) return { label: 'Moderate', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
    return { label: 'Poor', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
  };

  const getRiskClass = (risk: number) => {
    if (risk < 5.0) return { label: 'Low Risk', color: '#10b981' };
    if (risk < 7.5) return { label: 'Moderate Risk', color: '#eab308' };
    return { label: 'High Risk', color: '#ef4444' };
  };

  return (
    <div className="dashboard-scroll">
      {/* Top Search bar */}
      <div className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="Search climate metrics by city or country (e.g., London, India, Tokyo, United States)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-search" onClick={handleSearch} disabled={loading}>
          <Search size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Search
        </button>
      </div>

      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '24px', padding: '16px' }}>
          <p style={{ color: '#ef4444', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div className="status-dot" style={{ width: '16px', height: '16px', marginBottom: '16px' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Analyzing environment grids...</span>
        </div>
      ) : (
        metrics && (
          <div className="pulse-main-view">
            {/* Left Column: Metrics & Indicators */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={22} color="var(--primary-emerald)" />
                {metrics.location} Environmental Pulse
              </h2>

              <div className="metrics-grid">
                {/* Metric Card: Temp Anomaly */}
                <div className="glass-card metric-card">
                  <div className="metric-header">
                    <span>Decadal Warming</span>
                    <Activity size={16} color="var(--primary-emerald)" />
                  </div>
                  <div className="metric-value" style={{ color: 'var(--primary-emerald)' }}>
                    {metrics.temperature_anomaly.split(' ')[0]}
                  </div>
                  <div className="metric-footer">
                    <span>Temp deviation versus historical baselines.</span>
                  </div>
                </div>

                {/* Metric Card: AQI */}
                <div className="glass-card metric-card">
                  <div className="metric-header">
                    <span>Air Quality (AQI)</span>
                    <Wind size={16} color={getAqiClass(metrics.air_quality_index).color} />
                  </div>
                  <div className="metric-value" style={{ color: getAqiClass(metrics.air_quality_index).color }}>
                    {metrics.air_quality_index}
                  </div>
                  <div className="metric-footer" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      fontSize: '10px', 
                      fontWeight: 600,
                      background: getAqiClass(metrics.air_quality_index).bg,
                      color: getAqiClass(metrics.air_quality_index).color
                    }}>
                      {getAqiClass(metrics.air_quality_index).label}
                    </span>
                  </div>
                </div>

                {/* Metric Card: Weather Risk */}
                <div className="glass-card metric-card">
                  <div className="metric-header">
                    <span>Weather Risk Index</span>
                    <AlertTriangle size={16} color={getRiskClass(metrics.extreme_weather_risk_index).color} />
                  </div>
                  <div className="metric-value" style={{ color: getRiskClass(metrics.extreme_weather_risk_index).color }}>
                    {metrics.extreme_weather_risk_index}/10
                  </div>
                  <div className="metric-footer">
                    <span>{getRiskClass(metrics.extreme_weather_risk_index).label} for flood/heat events.</span>
                  </div>
                </div>

                {/* Metric Card: Clean Energy */}
                <div className="glass-card metric-card">
                  <div className="metric-header">
                    <span>Clean Grid Mix</span>
                    <ShieldCheck size={16} color="var(--primary-cyan)" />
                  </div>
                  <div className="metric-value" style={{ color: 'var(--primary-cyan)' }}>
                    {metrics.clean_energy_percentage}%
                  </div>
                  <div className="metric-footer">
                    <span>Renewable capacity feeding active power grid.</span>
                  </div>
                </div>
              </div>

              {/* Extra Details */}
              <div className="glass-card" style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Ecological Profile Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Forest Cover Shift: </span>
                    <strong style={{ color: metrics.forest_cover_change.startsWith('+') ? '#10b981' : '#ef4444' }}>
                      {metrics.forest_cover_change}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Primary Sector Emitter: </span>
                    <strong style={{ color: 'var(--text-main)' }}>{metrics.primary_emitters}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Policies & Net-Zero Target */}
            {policy && (
              <div className="glass-card" style={{ height: 'fit-content' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px' }}>
                  Country Climate Targets
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Net Zero Commitment Year</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                    {policy.net_zero_target_year}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Grid Emission Intensity</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {policy.grid_carbon_intensity}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Active Regulatory Policies</div>
                  <ul style={{ marginLeft: '16px', fontSize: '13.5px', color: 'var(--text-main)' }}>
                    {policy.core_policies.map((p, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Available Consumer Subsidies</div>
                  <p style={{ fontSize: '13.5px', color: 'var(--primary-emerald)', fontWeight: 500 }}>
                    {policy.active_incentives}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default Pulse;
