import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Badge } from './common/Badge';
import { Checkbox } from './common/Checkbox';
import { Pagination } from './common/Pagination';
import { Switch } from './common/Switch';
import { Tabs } from './common/Tabs';
import { DataTable, type DataTableColumn } from './data/DataTable';
import { Alert } from './feedback/Alert';
import { Icon } from './icons';
import { ThemeProvider } from '../theming/ThemeProvider';
import { ThemeToggle } from '../theming/ThemeToggle';

describe('design system — primitives', () => {
  it('Badge renders its content with the info variant', () => {
    render(<Badge variant="info">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('Icon is decorative by default and labeled when given a title', () => {
    const { rerender, container } = render(<Icon name="check" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    rerender(<Icon name="check" title="Done" />);
    expect(screen.getByRole('img', { name: 'Done' })).toBeInTheDocument();
  });

  it('Checkbox associates its label with the input', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByLabelText('Accept terms')).toBeInstanceOf(HTMLInputElement);
  });
});

describe('design system — interaction', () => {
  it('Switch toggles and reports the new state', () => {
    const onCheckedChange = vi.fn();
    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          checked={checked}
          onCheckedChange={(next) => {
            setChecked(next);
            onCheckedChange(next);
          }}
          label="Notifications"
        />
      );
    }
    render(<Harness />);
    const control = screen.getByRole('switch', { name: 'Notifications' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(control).toHaveAttribute('aria-checked', 'true');
  });

  it('Tabs reveals the selected panel', () => {
    render(
      <Tabs
        items={[
          { value: 'a', label: 'First', content: <p>Panel A</p> },
          { value: 'b', label: 'Second', content: <p>Panel B</p> },
        ]}
      />,
    );
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    expect(screen.getByText('Panel B')).toBeInTheDocument();
  });

  it('Pagination marks the current page and navigates', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageCount={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

describe('design system — feedback + data', () => {
  it('Alert exposes the alert role with a title', () => {
    render(
      <Alert variant="success" title="Saved">
        Your changes were saved.
      </Alert>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Saved');
    expect(alert).toHaveTextContent('Your changes were saved.');
  });

  it('DataTable renders rows and an empty state', () => {
    interface Row {
      id: string;
      name: string;
    }
    const columns: DataTableColumn<Row>[] = [
      { id: 'name', header: 'Name', cell: (row) => row.name },
    ];
    const { rerender } = render(
      <DataTable columns={columns} rows={[{ id: '1', name: 'Ada' }]} getRowId={(row) => row.id} />,
    );
    expect(screen.getByText('Ada')).toBeInTheDocument();
    rerender(<DataTable columns={columns} rows={[]} getRowId={(row) => row.id} />);
    expect(screen.getByText('No results')).toBeInTheDocument();
  });
});

describe('design system — theming', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('ThemeToggle switches the document theme class', () => {
    render(
      <ThemeProvider defaultMode="light" storageId="test">
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
