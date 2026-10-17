import { createContext, useContext, type ReactNode } from 'react';
import { ToastRegion, useToasts, type ToastMessage } from '../components/Toast';

type Notify = (toast: Omit<ToastMessage, 'id'>) => void;

const NotifyContext = createContext<Notify | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { toasts, push, dismiss } = useToasts();
  return (
    <NotifyContext.Provider value={push}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </NotifyContext.Provider>
  );
}

export function useNotify(): Notify {
  const notify = useContext(NotifyContext);
  if (!notify) {
    throw new Error('useNotify must be used inside NotificationsProvider');
  }
  return notify;
}
