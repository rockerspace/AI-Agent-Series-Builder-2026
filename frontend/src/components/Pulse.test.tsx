import React from 'react';
import { render, screen } from '@testing-library/react';
import Pulse from './Pulse';

describe('Pulse Component', () => {
  beforeAll(() => {
    window.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          location: "New York",
          country: "United States",
          coordinates: { lat: 40.7128, lon: -74.0060 },
          temperature: "22°C",
          air_quality_index: 45
        }),
      })
    );
  });

  it('renders search bar and search button on screen load', () => {
    render(<Pulse />);
    expect(screen.getByPlaceholderText(/Search climate/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Search/i })).toBeTruthy();
  });
});
