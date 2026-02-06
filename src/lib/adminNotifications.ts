export type AdminNotificationTone = 'success' | 'error' | 'info';

export type AdminNotificationPayload = {
  title: string;
  message: string;
  tone?: AdminNotificationTone;
};

export const ADMIN_NOTIFICATION_EVENT = 'admin-notification';

export const showAdminNotification = ({
  title,
  message,
  tone = 'info',
}: AdminNotificationPayload) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<AdminNotificationPayload>(ADMIN_NOTIFICATION_EVENT, {
      detail: { title, message, tone },
    })
  );
};
