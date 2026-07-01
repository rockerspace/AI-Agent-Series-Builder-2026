import React, { useState, useEffect } from 'react';
import { Leaf, Info } from 'lucide-react';

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
    offset_requirements: { trees_needed_per_year: 127, description: "" }
  });
  
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

    // Simple debounce to prevent flooding the server on slider movements
    const delayDebounce = setTimeout(() => {
      fetchCalculation();
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [transport, electricity, meals]);

  // Calculate percentage helper for charts
  const maxCO2 = Math.max(
    result.monthly_summary.transport_co2_kg,
    result.monthly_summary.electricity_co2_kg,
    result.monthly_summary.diet_co2_kg,
    1 // prevent zero division
  );

  const getPercent = (value: number) => {
    return `${(value / maxCO2) * 100}%`;
  };

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-grid">
        {/* Sliders Input Panel */}
        <div className="calculator-section">
          <div className="glass-card calculator-card">
            <h2 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              Carbon Calculator Input
            </h2>
            
            {/* Transport Slider */}
            <div className="form-group">
              <div className="slider-val">
                <label>Transport Distance (Vehicle)</label>
                <span>{transport} km/mo</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="3000" 
                step="50" 
                value={transport} 
                onChange={(e) => setTransport(Number(e.target.value))} 
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Estimate includes average petrol/diesel combustion footprint.</span>
            </div>

            {/* Utility Slider */}
            <div className="form-group">
              <div className="slider-val">
                <label>Grid Electricity</label>
                <span>{electricity} kWh/mo</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1000" 
                step="10" 
                value={electricity} 
                onChange={(e) => setElectricity(Number(e.target.value))} 
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Based on household electricity usage and average grid carbon index.</span>
            </div>

            {/* Diet Slider */}
            <div className="form-group">
              <div className="slider-val">
                <label>Diet (Meat meals)</label>
                <span>{meals} meals/mo</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="90" 
                step="1" 
                value={meals} 
                onChange={(e) => setMeals(Number(e.target.value))} 
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Meat products (especially beef) carry heavy livestock emission factors.</span>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="glass-card" style={{ display: 'flex', gap: '12px', padding: '16px' }}>
            <Info size={20} color="var(--primary-cyan)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <strong>Calculation Method:</strong> The engine uses global Greenhouse Gas Protocol emissions variables (Car: 0.18kg/km, Electricity: 0.40kg/kWh, Diet: 2.1kg/meal) to compute accurate offset metrics.
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="results-section">
          {/* Main ton display card */}
          <div className="glass-card co2-main-display">
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Annual Footprint</span>
            <div className="co2-num">
              {result.annual_summary.total_co2_metric_tons}
            </div>
            <span className="co2-unit">Metric Tons CO2</span>
            
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
              {result.annual_summary.carbon_tier} Carbon Footprint Tier
            </div>
          </div>

          {/* Emission breakdown bar chart */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Monthly Breakdown (kg CO2)</h3>
            
            <div className="bar-chart-container">
              {/* Transport Bar */}
              <div className="bar-row">
                <div className="bar-label">
                  <span>Transport Emissions</span>
                  <span>{result.monthly_summary.transport_co2_kg} kg</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill transport" style={{ width: getPercent(result.monthly_summary.transport_co2_kg) }} />
                </div>
              </div>

              {/* Utility Bar */}
              <div className="bar-row">
                <div className="bar-label">
                  <span>Electricity Emissions</span>
                  <span>{result.monthly_summary.electricity_co2_kg} kg</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill utility" style={{ width: getPercent(result.monthly_summary.electricity_co2_kg) }} />
                </div>
              </div>

              {/* Diet Bar */}
              <div className="bar-row">
                <div className="bar-label">
                  <span>Dietary Emissions</span>
                  <span>{result.monthly_summary.diet_co2_kg} kg</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill diet" style={{ width: getPercent(result.monthly_summary.diet_co2_kg) }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-dim)' }}>
              <span>Total Monthly:</span>
              <strong style={{ color: 'var(--text-main)' }}>{result.monthly_summary.total_co2_kg} kg</strong>
            </div>
          </div>

          {/* Offsetting Recommendations */}
          <div className="offset-box">
            <div className="offset-icon">
              <Leaf size={28} color="#10b981" />
            </div>
            <div className="offset-text">
              <h3>Target Plantings: {result.offset_requirements.trees_needed_per_year} Trees</h3>
              <p>You need to plant and nourish {result.offset_requirements.trees_needed_per_year} mature trees annually to fully offset your household and travel activities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
