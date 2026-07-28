import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolCallChip } from './ToolCallChip';

describe('ToolCallChip', () => {
  it('renders tool name', () => {
    render(<ToolCallChip toolName="fetchMetrics" />);
    expect(screen.getByText('MCP Server executing: fetchMetrics()')).toBeTruthy();
  });

  it('shows chip styling', () => {
    render(<ToolCallChip toolName="testTool" />);
    const chip = screen.getByText('MCP Server executing: testTool()').closest('div');
    expect(chip?.className.includes('tool-call-indicator')).toBe(true);
  });
});
