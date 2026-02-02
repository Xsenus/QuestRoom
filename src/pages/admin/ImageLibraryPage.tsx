import ImageLibraryPanel from '../../components/admin/ImageLibraryPanel';

export default function ImageLibraryPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Библиотека изображений</h2>
        <p className="text-sm text-gray-600 mt-2">
          Загружайте изображения для квестов, сертификатов, акций и зон чаепития.
          Здесь же можно удалять старые файлы.
        </p>
      </div>
      <ImageLibraryPanel
        allowUpload
        allowDelete
        showToggle={false}
        initialOpen
        title="Все изображения"
        emptyText="Изображения ещё не загружены."
      />
    </div>
  );
}
