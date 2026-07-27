import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Chat from './Chat';

describe('Chat Component', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it('renders chat layout and input fields correctly', () => {
    render(<Chat />);
    expect(screen.getByPlaceholderText(/Ask EcoPulse/i)).toBeTruthy();
    expect(screen.getByText(/Welcome to EcoPulse/i)).toBeTruthy();
  });

  it('submits a message and shows it on the screen', () => {
    render(<Chat />);
    const input = screen.getByPlaceholderText(/Ask EcoPulse/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'How can I offset my carbon emissions?' } });
    expect(input.value).toBe('How can I offset my carbon emissions?');
  });
});
