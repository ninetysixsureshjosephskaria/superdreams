import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from './app-providers';

function Boom(): never {
  throw new Error('Boom');
}

describe('AppProviders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the error fallback when a child throws', () => {
    // Suppress React's expected error logging for the thrown render error.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppProviders>
        <Boom />
      </AppProviders>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
