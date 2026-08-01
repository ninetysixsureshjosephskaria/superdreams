/** Formats an integer minor-unit amount as a USD-style string. */
export function formatMinor(minor: number): string {
  return (minor / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

/** Triggers a browser download of text content. */
export function downloadTextFile(fileName: string, content: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
