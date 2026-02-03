import ImageLibraryPanel from '../../components/admin/ImageLibraryPanel';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

export default function ImageLibraryPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('gallery.view');
  const canEdit = hasPermission('gallery.edit');
  const canDelete = hasPermission('gallery.delete');

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Галерея</h2>
        <p className="text-sm text-gray-600 mt-2">
          Загружайте изображения для квестов, сертификатов, акций и зон чаепития.
          Здесь же можно удалять старые файлы.
        </p>
      </div>
      <ImageLibraryPanel
        allowUpload={canEdit}
        allowDelete={canDelete}
        showToggle={false}
        initialOpen
        title="Все изображения"
        emptyText="Изображения ещё не загружены."
      />
    </div>
  );
}
