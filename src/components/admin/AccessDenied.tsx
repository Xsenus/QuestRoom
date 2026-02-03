export default function AccessDenied({
  title = 'Нет доступа',
  message = 'У вас нет прав для просмотра этого раздела.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
      <div className="text-base font-semibold">{title}</div>
      <p className="mt-2">{message}</p>
    </div>
  );
}
