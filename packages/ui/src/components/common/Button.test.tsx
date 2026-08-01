import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';
import { Spinner } from '../feedback/Spinner';

describe('ui components', () => {
  it('Button renders its label as an accessible button', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('Spinner exposes an accessible status label', () => {
    render(<Spinner label="Loading data" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading data')).toBeInTheDocument();
  });
});
