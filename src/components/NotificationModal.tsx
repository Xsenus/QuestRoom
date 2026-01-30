import { ReactNode } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

type NotificationTone = 'success' | 'error' | 'info';

interface NotificationModalProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  tone?: NotificationTone;
  showToneLabel?: boolean;
  actions?: ReactNode;
  onClose: () => void;
}

const toneStyles: Record<NotificationTone, { icon: ReactNode; accent: string }> = {
  success: {
    icon: <CheckCircle2 className="h-6 w-6 text-green-600" />,
    accent: 'bg-green-50 text-green-700',
  },
  error: {
    icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
    accent: 'bg-red-50 text-red-700',
  },
  info: {
    icon: <Info className="h-6 w-6 text-blue-600" />,
    accent: 'bg-blue-50 text-blue-700',
  },
};

export default function NotificationModal({
  isOpen,
  title,
  message,
  tone = 'info',
  showToneLabel = true,
  actions,
  onClose,
}: NotificationModalProps) {
  if (!isOpen) {
    return null;
  }

  const { icon, accent } = toneStyles[tone];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 text-sm text-gray-700">{message}</div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          {showToneLabel && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>
              {tone === 'success' ? 'Успешно' : tone === 'error' ? 'Ошибка' : 'Информация'}
            </span>
          )}
          {actions ? (
            actions
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Понятно
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
