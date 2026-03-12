import type { LayoutServerLoad } from './$types';

// TODO: Replace with real session auth when auth plan is implemented.
// For now, returns a hardcoded dev user so the dashboard renders with seed data.
export const load: LayoutServerLoad = async () => {
  return {
    user: {
      id: 'dev-user-001',
      name: 'Gary'
    }
  };
};
