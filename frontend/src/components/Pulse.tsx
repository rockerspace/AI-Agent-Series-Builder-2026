import React, { useState, useEffect } from 'react';
import { Search, MapPin, Wind, AlertTriangle, ShieldCheck, Globe, Thermometer } from 'lucide-react';

interface ClimateMetrics {
  location: string;
  country: string;
  coordinates: { lat: number; lon: number };
  temperature: string;
  temperature_anomaly: string;
  extreme_weather_risk_index: number;
  air_quality_index: number;
  pm2_5: number;
  pm10: number;
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

  // Render Leaflet Map dynamically
  useEffect(() => {
    if (!metrics || !metrics.coordinates) return;
    
    const loadLeaflet = () => {
      const container = document.getElementById('climate-map');
      if (!container) return;
      
      container.innerHTML = '';
      const mapDiv = document.createElement('div');
      mapDiv.id = 'map-instance';
      mapDiv.style.width = '100%';
      mapDiv.style.height = '100%';
      mapDiv.style.borderRadius = '12px';
      container.appendChild(mapDiv);
      
      const { lat, lon } = metrics.coordinates;
      
      // @ts-ignore
      if (typeof window.L !== 'undefined') {
        // @ts-ignore
        const map = window.L.map('map-instance').setView([lat, lon], 12);
        
        // @ts-ignore
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);
        
        const aqiColor = metrics.air_quality_index <= 50 ? '#10b981' : (metrics.air_quality_index <= 100 ? '#eab308' : '#ef4444');
        
        // @ts-ignore
        window.L.circle([lat, lon], {
          color: aqiColor,
          fillColor: aqiColor,
          fillOpacity: 0.15,
          radius: 4000
        }).addTo(map);

        // @ts-ignore
        window.L.circle([lat, lon], {
          color: '#f97316',
          fillColor: '#f97316',
          fillOpacity: 0.10,
          radius: 8000
        }).addTo(map);
        
        // @ts-ignore
        const marker = window.L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`<b>${metrics.location}</b><br>AQI: ${metrics.air_quality_index}<br>Risk Index: ${metrics.extreme_weather_risk_index}/10`).openPopup();
      }
    };
    
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = loadLeaflet;
      document.head.appendChild(script);
    } else {
      setTimeout(loadLeaflet, 200);
    }
  }, [metrics]);

  const fetchMetrics = async (locationTerm: string) => {
    if (!locationTerm.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const metricsRes = await fetch(`${apiUrl}/api/metrics?location=${encodeURIComponent(locationTerm)}`);
      
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
        
        const resolvedCountry = metricsData.country || locationTerm;
        const policyRes = await fetch(`${apiUrl}/api/policies?country=${encodeURIComponent(resolvedCountry)}`);
        if (policyRes.ok) {
          const policyData = await policyRes.json();
          setPolicy(policyData);
        }
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

  const handleSearch = () => {
    fetchMetrics(search);
  };

  useEffect(() => {
    if (!search.trim()) return;
    const delayDebounceFn = setTimeout(() => {
      fetchMetrics(search);
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const getAqiClass = (aqi: number) => {
    if (aqi <= 50) return { label: 'Good', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (aqi <= 100) return { label: 'Moderate', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
    return { label: 'Unhealthy', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
  };

  const getRiskClass = (risk: number) => {
    if (risk < 5.0) return { label: 'Low Risk', color: '#10b981' };
    if (risk < 7.5) return { label: 'Moderate Risk', color: '#eab308' };
    return { label: 'High Risk', color: '#ef4444' };
  };

  return (
    <div className="dashboard-scroll" style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
      {/* Top Search bar */}
      <div className="search-box" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          className="search-input"
          style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-main)', fontSize: '14px' }}
          placeholder="Search climate metrics by city or country (e.g., London, India, Tokyo, United States)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button 
          className="btn-search" 
          onClick={handleSearch} 
          disabled={loading}
          style={{ background: 'var(--primary-cyan)', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Search size={18} />
          Search
        </button>
      </div>

      {error && (
        <div className="glass-card" style={{ borderLeft: '4px solid #ef4444', marginBottom: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)' }}>
          <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px' }}>
          <div className="status-dot" style={{ width: '16px', height: '16px', marginBottom: '16px', background: 'var(--primary-cyan)' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Querying Open-Meteo Climate Grids & Live Air Telemetry...</span>
        </div>
      ) : (
        metrics && (
          <div className="pulse-main-view" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            
            {/* Left Column: Metrics & Indicators */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={22} color="var(--primary-cyan)" />
                  {metrics.location}, {metrics.country}
                </h2>
                
                {/* Coordinates Badge */}
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)' }}>
                  <Globe size={12} /> Lat: {metrics.coordinates.lat.toFixed(2)} | Lon: {metrics.coordinates.lon.toFixed(2)}
                </span>
              </div>

              {/* Geospatial Climate Risk Map */}
              <div 
                id="climate-map" 
                style={{ 
                  width: '100%', 
                  height: '320px', 
                  borderRadius: '16px', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid var(--border-glass)', 
                  marginBottom: '24px', 
                  overflow: 'hidden',
                  position: 'relative',
                  zIndex: 1
                }} 
              />

              <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                
                {/* Temperature */}
                <div className="glass-card metric-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
                  <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>
                    <span>Live Temp</span>
                    <Thermometer size={16} color="var(--primary-cyan)" />
                  </div>
                  <div className="metric-value" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {metrics.temperature}
                  </div>
                  <div className="metric-footer" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
                    Real-time weather station.
                  </div>
                </div>

                {/* AQI */}
                <div className="glass-card metric-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
                  <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>
                    <span>Air Quality Index</span>
                    <Wind size={16} color={getAqiClass(metrics.air_quality_index).color} />
                  </div>
                  <div className="metric-value" style={{ fontSize: '28px', fontWeight: 700, color: getAqiClass(metrics.air_quality_index).color }}>
                    {metrics.air_quality_index}
                  </div>
                  <div className="metric-footer" style={{ marginTop: '6px' }}>
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

                {/* Weather Risk */}
                <div className="glass-card metric-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
                  <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>
                    <span>Weather Risk Index</span>
                    <AlertTriangle size={16} color={getRiskClass(metrics.extreme_weather_risk_index).color} />
                  </div>
                  <div className="metric-value" style={{ fontSize: '28px', fontWeight: 700, color: getRiskClass(metrics.extreme_weather_risk_index).color }}>
                    {metrics.extreme_weather_risk_index}/10
                  </div>
                  <div className="metric-footer" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
                    {getRiskClass(metrics.extreme_weather_risk_index).label} for extreme events.
                  </div>
                </div>

                {/* Clean Energy */}
                <div className="glass-card metric-card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
                  <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>
                    <span>Clean Grid Mix</span>
                    <ShieldCheck size={16} color="var(--primary-cyan)" />
                  </div>
                  <div className="metric-value" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                    {metrics.clean_energy_percentage}%
                  </div>
                  <div className="metric-footer" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
                    Renewable capacity share.
                  </div>
                </div>
              </div>

              {/* AQI Particle Speeds */}
              <div className="glass-card" style={{ marginBottom: '24px', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>Particulate Telemetry Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fine Particulate (PM2.5)</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.pm2_5} µg/m³</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Coarse Particulate (PM10)</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.pm10} µg/m³</div>
                  </div>
                </div>
              </div>

              {/* Extra Details */}
              <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
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
              <div className="glass-card" style={{ height: 'fit-content', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
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
                  <ul style={{ marginLeft: '16px', fontSize: '13px', color: 'var(--text-main)', paddingLeft: '8px' }}>
                    {policy.core_policies.map((p, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Available Consumer Subsidies</div>
                  <p style={{ fontSize: '13px', color: 'var(--primary-cyan)', fontWeight: 500, margin: 0 }}>
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
