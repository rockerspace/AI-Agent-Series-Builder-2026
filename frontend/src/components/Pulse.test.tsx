import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Pulse from './Pulse';

// Mock Leaflet and Lucide
global.L = {
  map: jest.fn().mockReturnValue({
    setView: jest.fn().mockReturnThis(),
  }),
  tileLayer: jest.fn().mockReturnValue({
    addTo: jest.fn(),
  }),
  circle: jest.fn().mockReturnValue({
    addTo: jest.fn(),
  }),
  marker: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnValue({
      bindPopup: jest.fn().mockReturnValue({
        openPopup: jest.fn(),
      }),
    }),
  }),
} as any;

jest.mock('lucide-react', () => ({
  MapPin: () => <div data-testid="icon-mappin" />,
  Wind: () => <div data-testid="icon-wind" />,
  AlertTriangle: () => <div data-testid="icon-alerttriangle" />,
  ShieldCheck: () => <div data-testid="icon-shieldcheck" />,
  Globe: () => <div data-testid="icon-globe" />,
  Thermometer: () => <div data-testid="icon-thermometer" />,
  Search: () => <div data-testid="icon-search" />,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Pulse', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });



  const baseMetrics = {
    location: 'Test City',
    country: 'Test Country',
    coordinates: { lat: 10, lon: 20 },
    temperature: '25°C',
    temperature_anomaly: '0',
    extreme_weather_risk_index: 2.0,
    air_quality_index: 30,
    pm2_5: 10,
    pm10: 20,
    clean_energy_percentage: 50,
    forest_cover_change: '+1%',
    primary_emitters: 'Industry',
  };

  it('renders loading state shows spinner', () => {
    render(<Pulse />);
    const input = screen.getByPlaceholderText(/Search climate metrics/i);
    fireEvent.change(input, { target: { value: 'Paris' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText(/Querying Open-Meteo/i)).toBeTruthy();
  });

  it('empty search returns early', () => {
    render(<Pulse />);
    const input = screen.getByPlaceholderText(/Search climate metrics/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('error state shows error message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Down'));
    render(<Pulse />);
    const input = screen.getByPlaceholderText(/Search climate metrics/i);
    fireEvent.change(input, { target: { value: 'Nowhere' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch location data/i)).toBeTruthy();
    });
  });

  it('mocks fetch for fetchMetrics and verify metrics render', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => baseMetrics });
    mockFetch.mockResolvedValueOnce({ ok: false }); // Policy fails
    
    render(<Pulse />);
    const input = screen.getByPlaceholderText(/Search climate metrics/i);
    fireEvent.change(input, { target: { value: 'Test City' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('Test City, Test Country')).toBeTruthy();
      expect(screen.getByText('25°C')).toBeTruthy();
      expect(screen.getByText('50%')).toBeTruthy();
    });
  });

  it('policy card renders when policy exists', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => baseMetrics });
    mockFetch.mockResolvedValueOnce({ 
      ok: true, 
      json: async () => ({
        country: 'Test Country',
        net_zero_target_year: '2050',
        grid_carbon_intensity: 'low',
        core_policies: ['Policy 1'],
        active_incentives: 'Incentive 1'
      }) 
    });
    
    render(<Pulse />);
    const input = screen.getByPlaceholderText(/Search climate metrics/i);
    fireEvent.change(input, { target: { value: 'Test City' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(/Test Country Net-Zero & Regulatory Mandates/i)).toBeTruthy();
      expect(screen.getByText('Policy 1')).toBeTruthy();
    });
  });

  const testAqi = async (aqiValue: number, expectedLabel: string) => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...baseMetrics, air_quality_index: aqiValue }) });
    mockFetch.mockResolvedValueOnce({ ok: false });
    
    render(<Pulse />);
    const input = screen.getByPlaceholderText(/Search climate metrics/i);
    fireEvent.change(input, { target: { value: 'Test City' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(expectedLabel)).toBeTruthy();
    });
  };

  it('Test getAqiClass returns Good at 50', async () => await testAqi(50, 'Good'));
  it('Test getAqiClass returns Moderate at 51', async () => await testAqi(51, 'Moderate'));
  it('Test getAqiClass returns Moderate at 100', async () => await testAqi(100, 'Moderate'));
  it('Test getAqiClass returns Unhealthy at 101', async () => await testAqi(101, 'Unhealthy'));

  const testRisk = async (riskValue: number, expectedLabel: string) => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...baseMetrics, extreme_weather_risk_index: riskValue }) });
    mockFetch.mockResolvedValueOnce({ ok: false });
    
    render(<Pulse />);
    const input = screen.getByPlaceholderText(/Search climate metrics/i);
    fireEvent.change(input, { target: { value: 'Test City' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText(new RegExp(expectedLabel))).toBeTruthy();
    });
  };

  it('Test getRiskClass returns Low Risk at 4.9', async () => await testRisk(4.9, 'Low Risk'));
  it('Test getRiskClass returns Moderate Risk at 5.0', async () => await testRisk(5.0, 'Moderate Risk'));
  it('Test getRiskClass returns Moderate Risk at 7.4', async () => await testRisk(7.4, 'Moderate Risk'));
  it('Test getRiskClass returns High Risk at 7.5', async () => await testRisk(7.5, 'High Risk'));
});
