import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnterpriseSentinel from './EnterpriseSentinel';

jest.mock('lucide-react', () => ({
  Building2: () => <div data-testid="icon-building" />,
  Activity: () => <div data-testid="icon-activity" />,
  Zap: () => <div data-testid="icon-zap" />,
  FileText: () => <div data-testid="icon-filetext" />,
  Satellite: () => <div data-testid="icon-satellite" />,
  ShieldCheck: () => <div data-testid="icon-shieldcheck" />,
  RefreshCw: () => <div data-testid="icon-refreshcw" />,
  AlertTriangle: () => <div data-testid="icon-alert" />,
  ArrowUpRight: () => <div data-testid="icon-arrow" />
}));

describe('EnterpriseSentinel Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/enterprise/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            iot_sensor_telemetry: {
              telemetry: {
                co2_concentration_ppm: 420.5,
                pm2_5_ug_m3: 18.2,
                temperature_celsius: 24.5,
                air_quality_status: 'Good'
              }
            },
            satellite_plume_telemetry: {
              plume_detection: {
                ch4_methane_mixing_ratio_ppb: 1910.0,
                no2_column_density_umol_m2: 95.0,
                anomaly_flag: 'Normal Baseline',
                plume_dispersion_vector: 'WSW'
              }
            },
            grid_carbon_telemetry: {
              grid_region: 'IN-KA',
              grid_carbon_intensity_g_co2_kwh: 350,
              fuel_generation_mix: {
                solar_percent: 30,
                wind_percent: 20,
                hydro_percent: 10,
                coal_thermal_percent: 40
              }
            }
          })
        });
      }
      if (url.includes('/api/enterprise/scope-audit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            company_name: 'EcoPulse Enterprise Inc.',
            total_emissions_tco2: 125.4,
            breakdown: { scope1_direct_tco2: 12.0, scope2_grid_tco2: 100.0, scope3_supply_chain_tco2: 13.4 },
            compliance_rating: 'A (Net-Zero Leader)'
          })
        });
      }
      if (url.includes('/api/enterprise/demand-response')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'Demand Response Dispatched', load_shaved_kw: 65.0 })
        });
      }
      return Promise.resolve({ ok: false });
    }) as jest.Mock;
  });

  it('renders enterprise header title and controls', async () => {
    render(<EnterpriseSentinel />);
    expect(screen.getByText(/EcoPulse Enterprise OS/i)).toBeTruthy();
    expect(screen.getByText(/Refresh Telemetry/i)).toBeTruthy();
  });

  it('renders live IoT sensor grid telemetry after fetch', async () => {
    render(<EnterpriseSentinel />);
    await waitFor(() => {
      expect(screen.getByText('OpenSenseMap IoT Sensor Grid')).toBeTruthy();
      expect(screen.getByText('420.5')).toBeTruthy();
    });
  });

  it('triggers scope audit on button click', async () => {
    render(<EnterpriseSentinel />);
    const auditBtn = screen.getAllByText(/Run Enterprise Scope Audit/i)[0];
    fireEvent.click(auditBtn);
    await waitFor(() => {
      expect(screen.getByText('125.4')).toBeTruthy();
    });
  });
});
