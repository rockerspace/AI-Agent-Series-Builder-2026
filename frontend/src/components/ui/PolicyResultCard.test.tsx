import React from 'react';
import { render, screen } from '@testing-library/react';
import { PolicyResultCard } from './PolicyResultCard';

describe('PolicyResultCard', () => {
  const defaultProps = {
    country: 'France',
    netZeroYear: '2050',
    carbonIntensity: '50g CO2/kWh',
    policies: ['Carbon Tax', 'EV Subsidy'],
    incentives: 'Tax rebate'
  };

  it('renders country, net-zero year, carbon intensity', () => {
    render(<PolicyResultCard {...defaultProps} />);
    expect(screen.getByText(/France Net-Zero/i)).toBeTruthy();
    expect(screen.getByText('2050')).toBeTruthy();
    expect(screen.getByText('50g CO2/kWh')).toBeTruthy();
  });

  it('renders policy list', () => {
    render(<PolicyResultCard {...defaultProps} />);
    expect(screen.getByText('Carbon Tax')).toBeTruthy();
    expect(screen.getByText('EV Subsidy')).toBeTruthy();
  });

  it('handles empty policies array', () => {
    render(<PolicyResultCard {...defaultProps} policies={[]} />);
    expect(screen.queryByText('Carbon Tax')).not.toBeTruthy();
    expect(screen.getByText('Tax rebate')).toBeTruthy();
  });
});
