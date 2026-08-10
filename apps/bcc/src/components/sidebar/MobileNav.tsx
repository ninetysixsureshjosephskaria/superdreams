import { APP_NAME } from '@/constants';
import { useNavSections } from '@/navigation';
import { useNavigationStore } from '@/store';
import { Drawer } from '@superdreams/ui';

import { NavList } from './NavList';

/** Mobile navigation drawer: the grouped sidebar as an overlay on small screens. */
export function MobileNav() {
  const isOpen = useNavigationStore((state) => state.isMobileNavOpen);
  const close = useNavigationStore((state) => state.closeMobileNav);
  const sections = useNavSections();

  return (
    <Drawer isOpen={isOpen} onClose={close} side="left" title={APP_NAME} description="Navigation">
      <nav aria-label="Mobile navigation" className="space-y-4">
        {sections.map((section) => (
          <div key={section.key} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {section.label}
            </p>
            <NavList items={section.items} onNavigate={close} />
          </div>
        ))}
      </nav>
    </Drawer>
  );
}
