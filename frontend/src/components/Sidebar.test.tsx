import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

jest.mock('lucide-react', () => ({
  MessageSquare: () => <div data-testid="icon-messagesquare" />,
  Calculator: () => <div data-testid="icon-calculator" />,
  Globe: () => <div data-testid="icon-globe" />,
  Shield: () => <div data-testid="icon-shield" />,
  Mic: () => <div data-testid="icon-mic" />,
  RefreshCw: () => <div data-testid="icon-refreshcw" />,
  Building2: () => <div data-testid="icon-building2" />,
}));

describe('Sidebar', () => {
  it('renders all 6 navigation items', () => {
    render(<Sidebar activeTab="chat" setActiveTab={jest.fn()} />);
    expect(screen.getByText('Aura Chat')).toBeTruthy();
    expect(screen.getByText('Carbon Tracker')).toBeTruthy();
    expect(screen.getByText('Offset Bidding')).toBeTruthy();
    expect(screen.getByText('Climate Pulse')).toBeTruthy();
    expect(screen.getByText('Enterprise Sentinel')).toBeTruthy();
    expect(screen.getByText('Eco Voice')).toBeTruthy();
  });

  it('active tab has correct styling/class', () => {
    render(<Sidebar activeTab="calculator" setActiveTab={jest.fn()} />);
    const activeItem = screen.getByText('Carbon Tracker').closest('button');
    expect(activeItem?.className.includes('active')).toBe(true);
  });

  it('click triggers setActiveTab callback', () => {
    const setActiveTabMock = jest.fn();
    render(<Sidebar activeTab="chat" setActiveTab={setActiveTabMock} />);
    fireEvent.click(screen.getByText('Enterprise Sentinel'));
    expect(setActiveTabMock).toHaveBeenCalledWith('enterprise');
  });

  it('logo renders', () => {
    render(<Sidebar activeTab="chat" setActiveTab={jest.fn()} />);
    expect(screen.getByAltText('EcoPulse Logo')).toBeTruthy();
  });
});
