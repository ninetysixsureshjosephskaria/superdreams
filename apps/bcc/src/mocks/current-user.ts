/**
 * Mock signed-in administrator. **No authentication happens in this phase** —
 * this is static display data for the shell. The authentication phase replaces
 * it with the real session principal.
 */
export interface MockUser {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
}

export const MOCK_USER: MockUser = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Alex Morgan',
  email: 'alex.morgan@superdreams.test',
  roleLabel: 'Administrator',
};
