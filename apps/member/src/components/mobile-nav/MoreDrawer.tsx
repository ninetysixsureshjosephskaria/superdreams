import { NavList } from '@/components/sidebar';
import { useNavItems } from '@/navigation';
import { useNavigationStore } from '@/store';
import { Drawer } from '@superdreams/ui';

/** Full navigation drawer opened from the mobile bottom nav's "More" button. */
export function MoreDrawer() {
  const isOpen = useNavigationStore((state) => state.isMobileNavOpen);
  const close = useNavigationStore((state) => state.closeMobileNav);
  const items = useNavItems();

  return (
    <Drawer isOpen={isOpen} onClose={close} side="right" title="Menu" description="All navigation">
      <nav aria-label="More navigation">
        <NavList items={items} onNavigate={close} />
      </nav>
    </Drawer>
  );
}
