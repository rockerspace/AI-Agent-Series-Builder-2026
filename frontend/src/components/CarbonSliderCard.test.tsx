import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CarbonSliderCard } from './CarbonSliderCard';

describe('CarbonSliderCard Atomic Component', () => {
  const defaultProps = {
    label: 'Test Carbon Slider',
    value: 500,
    min: 0,
    max: 1000,
    step: 50,
    unit: 'kg',
    description: 'Unit testing description text.',
    onChange: jest.fn(),
  };

  it('renders the label, value, and description correctly', () => {
    render(<CarbonSliderCard {...defaultProps} />);
    expect(screen.getByText('Test Carbon Slider')).toBeTruthy();
    expect(screen.getByText('500 kg')).toBeTruthy();
    expect(screen.getByText('Unit testing description text.')).toBeTruthy();
  });

  it('triggers onChange callback when input values are adjusted', () => {
    render(<CarbonSliderCard {...defaultProps} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '600' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(600);
  });
});
