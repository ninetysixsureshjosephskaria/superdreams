import { create } from 'zustand';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  variant: NotificationVariant;
  title: string;
  description?: string;
}

interface NotificationState {
  notifications: Notification[];
  notify: (notification: Omit<Notification, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

/**
 * Client state: transient in-app notifications (toasts). Rendered by the
 * NotificationContainer feedback component.
 */
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  notify: (notification) => {
    const id = crypto.randomUUID();
    set((state) => ({ notifications: [...state.notifications, { ...notification, id }] }));
    return id;
  },
  dismiss: (id) => {
    set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id) }));
  },
  clear: () => {
    set({ notifications: [] });
  },
}));
