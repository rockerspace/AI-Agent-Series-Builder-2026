import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from './Dashboard';
import { useStore } from '../store/useStore';

jest.mock('lucide-react', () => ({
  Leaf: () => <div data-testid="icon-leaf" />,
  Info: () => <div data-testid="icon-info" />,
  Share2: () => <div data-testid="icon-share2" />,
  Award: () => <div data-testid="icon-award" />,
  Zap: () => <div data-testid="icon-zap" />,
  Plane: () => <div data-testid="icon-plane" />,
  Smartphone: () => <div data-testid="icon-smartphone" />,
}));

// Mock EventSource
class MockEventSource {
  onmessage: any;
  close: any = jest.fn();
  constructor(url: string) {
    this.onmessage = null;
  }
}
(global as any).EventSource = MockEventSource;

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../store/useStore', () => ({
  useStore: jest.fn(),
}));

describe('Dashboard', () => {
  const mockStore = {
    feed: [],
    addFeed: jest.fn(),
    warning: null,
    setWarning: jest.fn(),
    iotDevice: null,
    setIotDevice: jest.fn(),
  };

  beforeEach(() => {
    (useStore as unknown as jest.Mock).mockReturnValue(mockStore);
    mockFetch.mockClear();
    
    setupMock(2.8, "Moderate");
  });



  const setupMock = (tons: number, tier: string) => {
    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/marketplace/solar')) {
        return {
          ok: true,
          json: async () => ({
            recommended_system_size_kw: 5,
            net_investment_cost: 5000,
            currency: 'USD',
            government_subsidies: 1000,
            estimated_annual_savings: '$500',
            affiliate_referral_link: '#',
            primary_vendor: 'SolarCo'
          })
        };
      }
      if (typeof url === 'string' && url.includes('/api/iot')) {
        return {
          ok: true,
          json: async () => ({
            device_name: 'Test Device',
            current_temperature_c: 22,
            target_temperature_c: 24,
            power_draw_kw: 1.5,
            mode: 'eco',
            saving_mode: true
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          monthly_summary: { transport_co2_kg: 0, electricity_co2_kg: 0, diet_co2_kg: 0, total_co2_kg: 0 },
          annual_summary: { total_co2_metric_tons: tons, carbon_tier: tier },
          offset_requirements: { trees_needed_per_year: 0, description: "" },
          analogies: { smartphone_charges: 0, flight_km_equivalent: 0 }
        })
      };
    });
  };

  it('Test getEcoScoreGrade A+ (1.5)', async () => {
    setupMock(1.5, "Low");
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Eco-Score: A\+/i)).toBeTruthy();
      expect(screen.getByText(/Excellent/i)).toBeTruthy();
    });
  });

  it('Test getEcoScoreGrade A (3.0)', async () => {
    setupMock(3.0, "Low");
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Very Good/i)).toBeTruthy();
    });
  });

  it('Test getEcoScoreGrade B (5.0)', async () => {
    setupMock(5.0, "Moderate");
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Good\/Average/i)).toBeTruthy();
    });
  });

  it('Test getEcoScoreGrade C (8.5)', async () => {
    setupMock(8.5, "Moderate");
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Needs Work/i)).toBeTruthy();
    });
  });

  it('Test getEcoScoreGrade D (12.0)', async () => {
    setupMock(12.0, "High");
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/High Impact/i)).toBeTruthy();
    });
  });

  it('Test getEcoScoreGrade F (>12.0)', async () => {
    setupMock(15.0, "High");
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Excessive Impact/i)).toBeTruthy();
    });
  });

  it('Renders carbon calculator sliders', () => {
    render(<Dashboard />);
    expect(screen.getByText('Transport Distance (Vehicle)')).toBeTruthy();
    expect(screen.getByText('Grid Electricity')).toBeTruthy();
    expect(screen.getByText('Diet (Meat meals)')).toBeTruthy();
  });

  it('IoT null state shows Connecting message', () => {
    render(<Dashboard />);
    expect(screen.getByText('Connecting to Google Nest smart devices...')).toBeTruthy();
  });

  it('Solar quote hidden when electricity < 150', async () => {
    render(<Dashboard />);
    const sliders = screen.getAllByRole('slider');
    // Electricity slider is the second one
    fireEvent.change(sliders[1], { target: { value: '100' } });
    
    await waitFor(() => {
      expect(screen.queryByText(/Intelligent Recommendation: Go Solar/i)).not.toBeTruthy();
    });
  });

  it('Empty feed shows waiting message', () => {
    render(<Dashboard />);
    expect(screen.getByText('Waiting for live telemetry stream...')).toBeTruthy();
  });
});
