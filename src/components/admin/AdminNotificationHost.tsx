import { useEffect, useState } from 'react';
import NotificationModal from '../NotificationModal';
import {
  ADMIN_NOTIFICATION_EVENT,
  AdminNotificationPayload,
} from '../../lib/adminNotifications';

const defaultState: AdminNotificationPayload & { isOpen: boolean } = {
  isOpen: false,
  title: '',
  message: '',
  tone: 'info',
};

export default function AdminNotificationHost() {
  const [notification, setNotification] = useState(defaultState);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AdminNotificationPayload>;
      if (!customEvent.detail) return;
      setNotification({
        isOpen: true,
        title: customEvent.detail.title,
        message: customEvent.detail.message,
        tone: customEvent.detail.tone ?? 'info',
      });
    };

    window.addEventListener(ADMIN_NOTIFICATION_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATION_EVENT, handler as EventListener);
    };
  }, []);

  return (
    <NotificationModal
      isOpen={notification.isOpen}
      title={notification.title}
      message={notification.message}
      tone={notification.tone}
      onClose={() => setNotification((prev) => ({ ...prev, isOpen: false }))}
    />
  );
}
