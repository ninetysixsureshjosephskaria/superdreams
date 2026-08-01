/**
 * Mock signed-in member. **No authentication happens in this phase** — this is
 * static display data for the shell. The authentication phase replaces it with
 * the real session principal.
 */
export interface MockUser {
  id: string;
  name: string;
  email: string;
  tier: string;
  memberSince: string;
}

export const MOCK_USER: MockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Jordan Rivera',
  email: 'jordan.rivera@member.test',
  tier: 'Gold',
  memberSince: 'Jan 2023',
};
