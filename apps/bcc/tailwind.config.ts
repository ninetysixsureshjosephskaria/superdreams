import type { Config } from 'tailwindcss';

import { preset } from '@superdreams/theme';

export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Scan the shared design system so its component classes are generated.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
