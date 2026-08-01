export interface FooterProps {
  appName: string;
}

/** Application footer shell. The consuming app supplies its display name. */
export function Footer({ appName }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
      <p>
        © {year} {appName}. All rights reserved.
      </p>
    </footer>
  );
}
