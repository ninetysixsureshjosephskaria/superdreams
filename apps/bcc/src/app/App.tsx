import { RouterProvider } from 'react-router-dom';

import { AppProviders } from '@/providers';
import { router } from '@/routes';

/** Application composition root: global providers wrapping the router. */
export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
