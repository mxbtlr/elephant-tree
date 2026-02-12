import React from 'react';
import { render, screen } from '@testing-library/react';
import TodoProgress from './TodoProgress';

describe('TodoProgress', () => {
  it('renders empty state when total is 0', () => {
    render(<TodoProgress completed={0} total={0} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders percentage when total > 0', () => {
    render(<TodoProgress completed={2} total={4} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('caps at 100%', () => {
    render(<TodoProgress completed={10} total={5} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('uses defaults when no props', () => {
    render(<TodoProgress />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
