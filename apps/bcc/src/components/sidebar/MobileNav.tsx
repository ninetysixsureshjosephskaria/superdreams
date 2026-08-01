import { APP_NAME } from '@/constants';
import { useNavItems } from '@/navigation';
import { useNavigationStore } from '@/store';
import { Drawer } from '@superdreams/ui';

import { NavList } from './NavList';

/** Mobile navigation drawer: the sidebar as an overlay on small screens. */
export function MobileNav() {
  const isOpen = useNavigationStore((state) => state.isMobileNavOpen);
  const close = useNavigationStore((state) => state.closeMobileNav);
  const items = useNavItems();

  return (
    <Drawer isOpen={isOpen} onClose={close} side="left" title={APP_NAME} description="Navigation">
      <nav aria-label="Mobile navigation">
        <NavList items={items} onNavigate={close} />
      </nav>
    </Drawer>
  );
}
