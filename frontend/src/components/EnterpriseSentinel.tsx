import React, { useState, useEffect } from 'react';
import { Building2, Activity, Zap, FileText, Satellite, ShieldCheck, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { API_URL } from '../config';

export const EnterpriseSentinel: React.FC = () => {
  const { addFeed } = useStore();
  
  const [location, setLocation] = useState('Bengaluru');
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);
  
  // Scope 1-3 state
  const [companyName, setCompanyName] = useState('EcoPulse Enterprise Inc.');
  const [scope1Fuel, setScope1Fuel] = useState<number>(4500);
  const [scope2Kwh, setScope2Kwh] = useState<number>(18500);
  const [scope3Logistics, setScope3Logistics] = useState<number>(12000);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [demandResponseDispatched, setDemandResponseDispatched] = useState(false);

  // Fetch real-time telemetry from backend
  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/enterprise/telemetry?location=${encodeURIComponent(location)}`);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
        addFeed(`Fetched live telemetry for ${location} Industrial Zone`);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [location]);

  // Handle Scope Audit
  const handleScopeAudit = async () => {
    try {
      const res = await fetch(`${API_URL}/api/enterprise/scope-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          location: location,
          scope1_direct_fuel_liters: scope1Fuel,
          scope2_electricity_kwh: scope2Kwh,
          scope3_logistics_ton_km: scope3Logistics
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data);
        addFeed(`Completed Scope 1-3 corporate audit for ${companyName}`);
      }
    } catch (err) {
      console.error('Scope audit failed:', err);
    }
  };

  // Handle PDF Export
  const handleDownloadCsrdPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`${API_URL}/api/enterprise/generate-csrd-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          location: location,
          scope1_direct_fuel_liters: scope1Fuel,
          scope2_electricity_kwh: scope2Kwh,
          scope3_logistics_ton_km: scope3Logistics
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `csrd_sec_report_${companyName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        addFeed(`Generated & downloaded CSRD PDF for ${companyName}`);
      }
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Dispatch Demand Response
  const handleDemandResponse = async () => {
    try {
      const res = await fetch(`${API_URL}/api/enterprise/demand-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: 'FACILITY-BLR-01', mode: 'AUTO' })
      });
      if (res.ok) {
        setDemandResponseDispatched(true);
        addFeed('Dispatched grid-aware demand response to shaving peak load');
      }
    } catch (err) {
      console.error('Demand response dispatch failed:', err);
    }
  };

  const iot = telemetry?.iot_sensor_telemetry?.telemetry;
  const satellite = telemetry?.satellite_plume_telemetry?.plume_detection;
  const grid = telemetry?.grid_carbon_telemetry;

  return (
    <div className="tab-content enterprise-sentinel" style={{ padding: '24px', color: '#e2e8f0' }}>
      
      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
            <Building2 size={28} color="#10b981" />
            EcoPulse Enterprise OS — Live Telemetry & ESG Command Center
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Real-time industrial sensor grid, satellite methane plume tracking, and Scope 1-3 ESG compliance suite.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: '#10b981',
              fontWeight: 600
            }}
          >
            <option value="Bengaluru">Bengaluru Industrial Cluster (Peenya)</option>
            <option value="Mumbai">Mumbai Trans-Harbour Corridor</option>
            <option value="New York">New York Metro Energy Zone</option>
            <option value="London">Greater London Clean Air Zone</option>
            <option value="Tokyo">Tokyo Bay Industrial Belt</option>
          </select>

          <button 
            onClick={fetchTelemetry} 
            disabled={loading}
            className="search-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Grid Layout: Top 3 Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Card 1: OpenSenseMap IoT Stream */}
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '20px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#34d399' }}>
              <Activity size={18} /> OpenSenseMap IoT Sensor Grid
            </span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
              LIVE STREAM
            </span>
          </div>

          {iot ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>CO2 Concentration</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#34d399' }}>{iot.co2_concentration_ppm} <span style={{ fontSize: '12px' }}>ppm</span></div>
              </div>
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>PM 2.5 Fine Particles</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{iot.pm2_5_ug_m3} <span style={{ fontSize: '12px' }}>µg/m³</span></div>
              </div>
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Ambient Temp</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>{iot.temperature_celsius} °C</div>
              </div>
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Air Quality Grade</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{iot.air_quality_status}</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Streaming telemetry...</div>
          )}
        </div>

        {/* Card 2: Sentinel-5P Satellite Plume Radar */}
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '20px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#38bdf8' }}>
              <Satellite size={18} /> Sentinel-5P Satellite Plume Radar
            </span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
              ESA / NASA
            </span>
          </div>

          {satellite ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Methane (CH4) Mixing</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e' }}>{satellite.ch4_methane_mixing_ratio_ppb} <span style={{ fontSize: '12px' }}>ppb</span></div>
              </div>
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>NO2 Density Column</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7' }}>{satellite.no2_column_density_umol_m2} <span style={{ fontSize: '12px' }}>µmol/m²</span></div>
              </div>
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Plume Dispersion Anomaly</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginTop: '2px' }}>{satellite.anomaly_flag} ({satellite.plume_dispersion_vector})</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Reading satellite feed...</div>
          )}
        </div>

        {/* Card 3: Grid Carbon Intensity & Demand Response */}
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '20px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#f59e0b' }}>
              <Zap size={18} /> Grid Carbon Intensity & Demand Response
            </span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
              {grid?.grid_region || 'IN-KA'}
            </span>
          </div>

          {grid ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Grid Carbon Intensity</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>
                    {grid.grid_carbon_intensity_g_co2_kwh} <span style={{ fontSize: '13px' }}>gCO2eq/kWh</span>
                  </div>
                </div>
                <button
                  onClick={handleDemandResponse}
                  disabled={demandResponseDispatched}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: demandResponseDispatched ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: demandResponseDispatched ? '#34d399' : '#f59e0b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {demandResponseDispatched ? '✓ DR Dispatched' : 'Dispatch Demand Response'}
                </button>
              </div>

              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Fuel Generation Mix</div>
              <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ width: `${grid.fuel_generation_mix?.solar_percent || 30}%`, backgroundColor: '#f59e0b' }} title="Solar" />
                <div style={{ width: `${grid.fuel_generation_mix?.wind_percent || 20}%`, backgroundColor: '#38bdf8' }} title="Wind" />
                <div style={{ width: `${grid.fuel_generation_mix?.hydro_percent || 10}%`, backgroundColor: '#34d399' }} title="Hydro" />
                <div style={{ width: `${grid.fuel_generation_mix?.coal_thermal_percent || 40}%`, backgroundColor: '#64748b' }} title="Coal/Thermal" />
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>☀️ Solar: {grid.fuel_generation_mix?.solar_percent}%</span>
                <span>💨 Wind: {grid.fuel_generation_mix?.wind_percent}%</span>
                <span>🏭 Coal: {grid.fuel_generation_mix?.coal_thermal_percent}%</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Syncing grid telemetry...</div>
          )}
        </div>

      </div>

      {/* Main Section: Corporate Scope 1-3 Carbon Auditor & CSRD PDF Exporter */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#10b981" /> Corporate Scope 1-3 Audit & CSRD / SEC Compliance Exporter
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Compute enterprise direct combustion (Scope 1), purchased energy (Scope 2), and supply chain logistics (Scope 3).
            </p>
          </div>

          <button
            onClick={handleDownloadCsrdPdf}
            disabled={downloadingPdf}
            className="search-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '14px' }}
          >
            <ShieldCheck size={18} />
            {downloadingPdf ? 'Compiling PDF...' : 'Download Certified CSRD / SEC PDF'}
          </button>
        </div>

        {/* Input Controls & Audit Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Inputs Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Organization Legal Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Scope 1: Direct Fleet/Generator Fuel (Liters Diesel)</label>
              <input
                type="number"
                value={scope1Fuel}
                onChange={(e) => setScope1Fuel(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Scope 2: Facility Grid Electricity (kWh)</label>
              <input
                type="number"
                value={scope2Kwh}
                onChange={(e) => setScope2Kwh(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#f8fafc' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Scope 3: Supply Chain Logistics (Ton-KM Freight)</label>
              <input
                type="number"
                value={scope3Logistics}
                onChange={(e) => setScope3Logistics(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#f8fafc' }}
              />
            </div>

            <button
              onClick={handleScopeAudit}
              style={{
                padding: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                borderRadius: '8px',
                color: '#34d399',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Run Enterprise Scope Audit
            </button>
          </div>

          {/* Audit Results Breakdown */}
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Audit Calculation & Compliance Grade
            </h4>

            {auditResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '14px', color: '#e2e8f0' }}>Total Carbon Liability</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{auditResult.total_emissions_tco2} <span style={{ fontSize: '12px' }}>tCO2e</span></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>Scope 1 Direct Combustion:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{auditResult.breakdown?.scope1_direct_tco2} tCO2</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>Scope 2 Purchased Grid Power:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{auditResult.breakdown?.scope2_grid_tco2} tCO2</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>Scope 3 Supply Chain Freight:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{auditResult.breakdown?.scope3_supply_chain_tco2} tCO2</span>
                </div>

                <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>ESG Compliance Rating</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>{auditResult.compliance_rating}</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                Click <strong>"Run Enterprise Scope Audit"</strong> to compute corporate carbon liability metrics.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default EnterpriseSentinel;
