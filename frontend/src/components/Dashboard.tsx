import React, { useState, useEffect } from 'react';
import { Leaf, Info, Share2, Award, Zap, Plane, Smartphone } from 'lucide-react';

interface CalculationResult {
  monthly_summary: {
    transport_co2_kg: number;
    electricity_co2_kg: number;
    diet_co2_kg: number;
    total_co2_kg: number;
  };
  annual_summary: {
    total_co2_metric_tons: number;
    carbon_tier: string;
  };
  offset_requirements: {
    trees_needed_per_year: number;
    description: string;
  };
  analogies?: {
    smartphone_charges: number;
    flight_km_equivalent: number;
  };
}

const Dashboard: React.FC = () => {
  // Input states
  const [transport, setTransport] = useState(600); // km/month
  const [electricity, setElectricity] = useState(250); // kWh/month
  const [meals, setMeals] = useState(12); // meat meals/month
  
  // Output state
  const [result, setResult] = useState<CalculationResult>({
    monthly_summary: { transport_co2_kg: 108, electricity_co2_kg: 100, diet_co2_kg: 25.2, total_co2_kg: 233.2 },
    annual_summary: { total_co2_metric_tons: 2.8, carbon_tier: "Moderate" },
    offset_requirements: { trees_needed_per_year: 127, description: "" },
    analogies: { smartphone_charges: 28217, flight_km_equivalent: 2027 }
  });

  const [copied, setCopied] = useState(false);
  const [feed, setFeed] = useState<Array<{ id: number; text: string; time: string }>>([]);
  const [warning, setWarning] = useState<{ location: string; aqi: number; warning_text: string } | null>(null);
  const [solarQuote, setSolarQuote] = useState<any>(null);

  // Fetch solar marketplace quotes dynamically
  useEffect(() => {
    const fetchSolarQuote = async () => {
      if (electricity < 150) {
        setSolarQuote(null);
        return;
      }
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${apiUrl}/api/marketplace/solar?location=Mumbai&monthly_kwh=${electricity}`);
        if (response.ok) {
          const data = await response.json();
          setSolarQuote(data);
        }
      } catch (error) {
        console.error("Failed to fetch solar quote:", error);
      }
    };
    fetchSolarQuote();
  }, [electricity]);

  // Connect to Kafka SSE Stream
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const eventSource = new EventSource(`${apiUrl}/api/stream/feed`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        let eventText = "";
        if (data.event_type === "search") {
          eventText = `City searched: ${data.payload.location} (AQI: ${data.payload.metrics.air_quality_index})`;
        } else if (data.event_type === "calculate") {
          eventText = `Footprint math: ${data.payload.result.annual_summary.total_co2_metric_tons} tons CO2`;
        } else if (data.event_type === "warning") {
          setWarning(data.payload);
        }
        
        if (eventText) {
          setFeed((prev) => [
            { id: Date.now() + Math.random(), text: eventText, time: new Date().toLocaleTimeString() },
            ...prev.slice(0, 4)
          ]);
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    return () => eventSource.close();
  }, []);
  
  // Fetch calculation from backend
  useEffect(() => {
    const fetchCalculation = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(
          `${apiUrl}/api/calculate?transport_km=${transport}&electricity_kwh=${electricity}&meals=${meals}`
        );
        if (response.ok) {
          const data = await response.json();
          setResult(data);
        }
      } catch (error) {
        console.error("Failed to calculate carbon footprint:", error);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchCalculation();
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [transport, electricity, meals]);

  // Determine Eco-Score Letter Grade based on annual CO2 metric tons
  const getEcoScoreGrade = (tons: number) => {
    if (tons <= 1.5) return { grade: "A+", label: "Excellent", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
    if (tons <= 3.0) return { grade: "A", label: "Very Good", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
    if (tons <= 5.0) return { grade: "B", label: "Good/Average", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" };
    if (tons <= 8.5) return { grade: "C", label: "Needs Work", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" };
    if (tons <= 12.0) return { grade: "D", label: "High Impact", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
    return { grade: "F", label: "Excessive Impact", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
  };

  const score = getEcoScoreGrade(result.annual_summary.total_co2_metric_tons);



  const copyShareText = () => {
    const text = `🌱 I just calculated my carbon footprint on EcoPulse! My Eco-Score is "${score.grade}" (${score.label}) with ${result.annual_summary.total_co2_metric_tons} metric tons of CO2 annually. To offset this, I'll need to plant ${result.offset_requirements.trees_needed_per_year} trees. Check yours: https://ai-agent-series-builder-2026-nac4-f5jmwu0b9.vercel.app #EcoPulse #ClimateAction #Sustainability`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="dashboard-scroll" style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
      {warning && (
        <div className="warning-banner" style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          animation: 'pulse-border 2s infinite alternate',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🚨</span>
            <div>
              <h4 style={{ margin: 0, color: '#f87171', fontWeight: 600, fontSize: '15px' }}>
                Critical Air Quality Alert: {warning.location} (AQI: {warning.aqi})
              </h4>
              <p style={{ margin: '4px 0 0 0', color: '#fca5a5', fontSize: '13px', lineHeight: 1.4 }}>
                {warning.warning_text}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setWarning(null)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#f87171', 
              fontSize: '22px', 
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px'
            }}
          >
            &times;
          </button>
        </div>
      )}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Sliders Input Panel */}
        <div className="calculator-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card calculator-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--primary-cyan)" /> Carbon Calculator Inputs
            </h2>
            
            {/* Transport Slider */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <div className="slider-val" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                <label>Transport Distance (Vehicle)</label>
                <span style={{ color: 'var(--primary-cyan)' }}>{transport} km/mo</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="3000" 
                step="50" 
                value={transport} 
                onChange={(e) => setTransport(Number(e.target.value))} 
                style={{ width: '100%', accentColor: 'var(--primary-cyan)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>Estimate includes average petrol/diesel combustion footprint.</span>
            </div>

            {/* Utility Slider */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <div className="slider-val" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                <label>Grid Electricity</label>
                <span style={{ color: 'var(--primary-cyan)' }}>{electricity} kWh/mo</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1000" 
                step="10" 
                value={electricity} 
                onChange={(e) => setElectricity(Number(e.target.value))} 
                style={{ width: '100%', accentColor: 'var(--primary-cyan)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>Based on household electricity usage and average grid carbon index.</span>
            </div>

            {/* Diet Slider */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <div className="slider-val" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                <label>Diet (Meat meals)</label>
                <span style={{ color: 'var(--primary-cyan)' }}>{meals} meals/mo</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="90" 
                step="1" 
                value={meals} 
                onChange={(e) => setMeals(Number(e.target.value))} 
                style={{ width: '100%', accentColor: 'var(--primary-cyan)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>Meat products (especially beef) carry heavy livestock emission factors.</span>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="glass-card" style={{ display: 'flex', gap: '12px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
            <Info size={20} color="var(--primary-cyan)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <strong>Calculation Method:</strong> The engine uses global Greenhouse Gas Protocol emissions variables (Car: 0.18kg/km, Electricity: 0.40kg/kWh, Diet: 2.1kg/meal) to compute accurate offset metrics.
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="results-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main ton display card with Eco-Score Badge */}
          <div className="glass-card co2-main-display" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            
            {/* Eco-Score Badge */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: score.bg, border: `1px solid ${score.color}`, color: score.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              <Award size={14} /> Eco-Score: {score.grade}
            </div>

            <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Annual Footprint</span>
            <div className="co2-num" style={{ fontSize: '64px', fontWeight: 800, color: 'var(--primary-cyan)', textShadow: '0 0 20px rgba(0, 240, 255, 0.2)' }}>
              {result.annual_summary.total_co2_metric_tons}
            </div>
            <span className="co2-unit" style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Metric Tons CO2 / Year</span>
            
            <div style={{ 
              marginTop: '16px', 
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontSize: '13px', 
              fontWeight: 600, 
              background: result.annual_summary.carbon_tier === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: result.annual_summary.carbon_tier === 'High' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
              color: result.annual_summary.carbon_tier === 'High' ? '#ef4444' : '#10b981'
            }}>
              {result.annual_summary.carbon_tier} Carbon Footprint Tier ({score.label})
            </div>
          </div>

          {/* Real-world Impact Analogies */}
          <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Real-World Impact Equivalents
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Smartphone size={24} color="var(--primary-cyan)" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{result.analogies?.smartphone_charges.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Smartphone Charges</div>
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Plane size={24} color="#a855f7" />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{result.analogies?.flight_km_equivalent.toLocaleString()} km</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Economy Flight Equiv.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Solar Marketplace Card */}
          {solarQuote && (
            <div className="solar-marketplace-card" style={{ 
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(249, 115, 22, 0.04) 100%)', 
              border: '1px solid rgba(234, 179, 8, 0.3)', 
              padding: '20px', 
              borderRadius: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>☀️</span>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#facc15', margin: 0 }}>
                  Intelligent Recommendation: Go Solar
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Your high electricity footprint ({electricity} kWh/mo) qualifies you for solar offset. Here is your custom installation quote:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <div>Recommended System: <strong style={{ color: '#fff' }}>{solarQuote.recommended_system_size_kw} kW</strong></div>
                <div>Net Cost: <strong style={{ color: '#facc15' }}>{solarQuote.currency === 'INR' ? '₹' : '$'}{solarQuote.net_investment_cost.toLocaleString()}</strong></div>
                <div style={{ gridColumn: 'span 2', fontSize: '11px', color: '#86efac', marginTop: '4px' }}>
                  ✓ Includes {solarQuote.currency === 'INR' ? '₹' : '$'}{solarQuote.government_subsidies.toLocaleString()} government subsidy
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 600 }}>
                {solarQuote.estimated_annual_savings}
              </div>
              <a 
                href={solarQuote.affiliate_referral_link} 
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  background: '#eab308', 
                  color: '#070a13', 
                  textDecoration: 'none', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  textAlign: 'center', 
                  transition: 'background 0.2s',
                  boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)'
                }}
              >
                Apply for Quote via {solarQuote.primary_vendor} &rarr;
              </a>
            </div>
          )}

          {/* Offsetting Target */}
          <div className="offset-box" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px', borderRadius: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="offset-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '50%', color: '#10b981' }}>
              <Leaf size={28} />
            </div>
            <div className="offset-text">
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', margin: 0 }}>Target Offset: {result.offset_requirements.trees_needed_per_year} Trees</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Plant and nurture {result.offset_requirements.trees_needed_per_year} mature trees annually to fully absorb your lifestyle emissions.
              </p>
            </div>
          </div>

          {/* Live Global Activity Feed */}
          <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-cyan)', margin: 0 }}>
              <span className="status-dot" style={{ width: '8px', height: '8px', background: '#10b981', boxShadow: '0 0 8px #10b981', display: 'inline-block', borderRadius: '50%' }}></span>
              Live Climate Stream (Kafka)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', marginTop: '12px' }}>
              {feed.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', padding: '8px' }}>
                  Waiting for live telemetry stream...
                </div>
              ) : (
                feed.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-main)' }}>{item.text}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Share Option */}
          <button 
            onClick={copyShareText}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              background: copied ? '#10b981' : 'var(--primary-cyan)', 
              color: '#000', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: 700, 
              transition: 'all 0.2s ease-in-out' 
            }}
          >
            <Share2 size={16} />
            {copied ? "Copied Share Badge!" : "Share Results to LinkedIn"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
