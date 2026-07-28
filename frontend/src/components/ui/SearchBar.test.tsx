import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('renders input and button', () => {
    render(<SearchBar value="" loading={false} onChange={jest.fn()} onSearch={jest.fn()} />);
    expect(screen.getByPlaceholderText(/Search climate metrics/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Search/i })).toBeTruthy();
  });

  it('triggers onSearch when Enter key is pressed', () => {
    const onSearchMock = jest.fn();
    render(<SearchBar value="Paris" loading={false} onChange={jest.fn()} onSearch={onSearchMock} />);
    const input = screen.getByPlaceholderText(/Search climate metrics/i);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onSearchMock).toHaveBeenCalled();
  });

  it('disables button during loading state', () => {
    render(<SearchBar value="" loading={true} onChange={jest.fn()} onSearch={jest.fn()} />);
    const button = screen.getByRole('button');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Searching...')).toBeTruthy();
  });
});
