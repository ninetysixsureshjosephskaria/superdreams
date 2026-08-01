import { useTheme } from './useTheme';
import { IconButton } from '../components/common/IconButton';
import { Icon } from '../components/icons';

export interface ThemeToggleProps {
  className?: string;
}

/** One-tap light/dark toggle. Reads and updates the current theme. */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const toDark = theme !== 'dark';
  return (
    <IconButton
      label={toDark ? 'Switch to dark mode' : 'Switch to light mode'}
      variant="ghost"
      onClick={toggle}
      className={className}
    >
      <Icon name={toDark ? 'moon' : 'sun'} />
    </IconButton>
  );
}
