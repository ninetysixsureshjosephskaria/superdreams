import type { ReactNode } from 'react';

import type { ResolvedTheme } from '@superdreams/types';

import { Button } from '../common';

function MenuIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface AppHeaderProps {
  appName: string;
  resolvedTheme: ResolvedTheme;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  actions?: ReactNode;
}

/**
 * Application header shell: sidebar toggle, title, optional actions, and a theme
 * switch. Store/theme wiring is injected by the consuming app via props.
 */
export function AppHeader({
  appName,
  resolvedTheme,
  onToggleSidebar,
  onToggleTheme,
  actions,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation sidebar"
      >
        <MenuIcon />
      </Button>
      <span className="truncate font-semibold">{appName}</span>
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTheme}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </Button>
      </div>
    </header>
  );
}
