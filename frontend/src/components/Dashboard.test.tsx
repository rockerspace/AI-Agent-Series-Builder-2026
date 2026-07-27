import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

describe('Dashboard Component', () => {
  beforeAll(() => {
    window.EventSource = jest.fn().mockImplementation(() => ({
      onmessage: null,
      close: jest.fn(),
    }));
    window.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          device_name: "Google Nest Thermostat",
          current_temperature_c: 24.5,
          target_temperature_c: 22.0,
          power_draw_kw: 2.2,
          mode: "cooling",
          saving_mode: false
        }),
      })
    );
  });

  it('renders carbon footprint gauge and sliders panel', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Carbon Calculator Inputs/i)).toBeTruthy();
    expect(screen.getByText(/Annual Footprint/i)).toBeTruthy();
    expect(screen.getByText(/Metric Tons CO2 \/ Year/i)).toBeTruthy();
  });
});
