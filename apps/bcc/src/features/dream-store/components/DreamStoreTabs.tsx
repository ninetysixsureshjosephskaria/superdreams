import { NavLink } from 'react-router-dom';

import { cn } from '@superdreams/utils';

const TABS = [
  { label: 'Products', to: '/dream-store/products' },
  { label: 'Categories', to: '/dream-store/categories' },
  { label: 'Orders', to: '/dream-store/orders' },
  { label: 'Inventory', to: '/dream-store/inventory' },
];

/** Section tabs for the Dream Store admin, driving the four sub-pages. */
export function DreamStoreTabs(): JSX.Element {
  return (
    <nav aria-label="Dream Store sections" className="mb-6 flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
