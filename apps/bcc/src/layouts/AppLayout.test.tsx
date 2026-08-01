import { screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';

import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('renders the application shell regions', () => {
    const router = createMemoryRouter(
      [
        {
          element: <AppLayout />,
          children: [{ index: true, element: <div>Home content</div> }],
        },
      ],
      { initialEntries: ['/'] },
    );

    renderWithProviders(<RouterProvider router={router} />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
  });
});
