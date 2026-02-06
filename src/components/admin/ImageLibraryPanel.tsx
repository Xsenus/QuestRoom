import { useEffect, useMemo, useState } from 'react';
import { Copy, LayoutGrid, List, Trash2, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '../../lib/imageOptimizations';
import { ImageAsset } from '../../lib/types';
import NotificationModal from '../NotificationModal';

type ImageLibraryPanelProps = {
  onSelect?: (url: string, image: ImageAsset) => void;
  allowUpload?: boolean;
  allowDelete?: boolean;
  showToggle?: boolean;
  initialOpen?: boolean;
  toggleLabelOpen?: string;
  toggleLabelClosed?: string;
  title?: string;
  emptyText?: string;
};

type ViewMode = 'grid' | 'table';

type NotificationState = {
  isOpen: boolean;
  title: string;
  message: string;
  tone: 'success' | 'error' | 'info';
};

const IMAGE_LIBRARY_PAGE_SIZE = 20;

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export default function ImageLibraryPanel({
  onSelect,
  allowUpload = false,
  allowDelete = false,
  showToggle = true,
  initialOpen = false,
  toggleLabelOpen = 'Скрыть библиотеку',
  toggleLabelClosed = 'Открыть библиотеку',
  title = 'Галерея',
  emptyText = 'В базе пока нет изображений.',
}: ImageLibraryPanelProps) {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(initialOpen || !showToggle);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
  });
  const [imageToDelete, setImageToDelete] = useState<ImageAsset | null>(null);

  const showNotification = (title: string, message: string, tone: NotificationState['tone'] = 'info') => {
    setNotification({
      isOpen: true,
      title,
      message,
      tone,
    });
  };

  const loadImages = async (reset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const data = await api.getImages({ limit: IMAGE_LIBRARY_PAGE_SIZE, offset: currentOffset });
      setImages((prev) => (reset ? data : [...prev, ...data]));
      const nextOffset = currentOffset + data.length;
      setOffset(nextOffset);
      setHasMore(data.length === IMAGE_LIBRARY_PAGE_SIZE);
    } catch (error) {
      showNotification('Ошибка', 'Ошибка загрузки библиотеки изображений: ' + (error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    setIsUploading(true);
    try {
      await api.uploadImage(file);
      await loadImages(true);
      showNotification('Готово', 'Изображение успешно загружено.', 'success');
    } catch (error) {
      showNotification('Ошибка', 'Ошибка загрузки изображения: ' + (error as Error).message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (image: ImageAsset) => {
    setImageToDelete(image);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    try {
      await api.deleteImage(imageToDelete.id);
      setImages((prev) => prev.filter((item) => item.id !== imageToDelete.id));
      showNotification('Готово', 'Изображение удалено.', 'success');
    } catch (error) {
      showNotification('Ошибка', 'Ошибка удаления изображения: ' + (error as Error).message, 'error');
    } finally {
      setImageToDelete(null);
    }
  };

  const filteredImages = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return images;
    return images.filter((image) => image.fileName.toLowerCase().includes(trimmed));
  }, [images, search]);

  useEffect(() => {
    if (isOpen && images.length === 0) {
      loadImages(true);
    }
  }, [isOpen]);

  const handleToggle = async () => {
    const nextValue = !isOpen;
    setIsOpen(nextValue);
    if (nextValue && images.length === 0) {
      await loadImages(true);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch {
      success = false;
    }
    document.body.removeChild(textarea);
    return success;
  };

  const copyImageUrl = async (url: string) => {
    const fullUrl = new URL(url, window.location.origin).toString();

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(fullUrl);
        showNotification('Скопировано', 'Ссылка на изображение скопирована в буфер обмена.', 'success');
        return;
      } catch {
        // fallback below
      }
    }

    if (fallbackCopyText(fullUrl)) {
      showNotification('Скопировано', 'Ссылка на изображение скопирована в буфер обмена.', 'success');
      return;
    }

    showNotification(
      'Не удалось скопировать',
      'Браузер запретил доступ к буферу обмена. Скопируйте ссылку вручную: ' + fullUrl,
      'error'
    );
  };

  return (
    <>
      <div className="space-y-3">
        {showToggle && (
          <button
            type="button"
            onClick={handleToggle}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            {isOpen ? toggleLabelOpen : toggleLabelClosed}
          </button>
        )}
        {isOpen && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-700">{title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                      viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Плитка
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                      viewMode === 'table' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" /> Таблица
                  </button>
                </div>
                {allowUpload && (
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg cursor-pointer hover:bg-gray-100">
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Загрузка...' : 'Загрузить файл'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleUpload(event.target.files?.[0])}
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => loadImages(true)}
                  className="text-xs text-red-600 hover:text-red-700"
                  disabled={isLoading}
                >
                  Обновить
                </button>
              </div>
            </div>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по имени файла"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-300 focus:outline-none"
            />

            {filteredImages.length === 0 && !isLoading ? (
              <p className="text-sm text-gray-500">{emptyText}</p>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredImages.map((image) => {
                  const cardContent = (
                    <>
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={getOptimizedImageUrl(image.url, { width: 360, quality: 70, format: 'webp' })}
                          srcSet={getResponsiveSrcSet(image.url, [180, 240, 360, 480], {
                            quality: 70,
                            format: 'webp',
                          })}
                          sizes="(min-width: 768px) 25vw, 50vw"
                          alt={image.fileName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        {allowDelete && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(image);
                            }}
                            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-600 shadow hover:bg-white"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-xs text-gray-600 truncate">{image.fileName}</p>
                        <p className="text-[11px] text-gray-400">{formatBytes(image.sizeBytes)}</p>
                      </div>
                    </>
                  );

                  if (onSelect) {
                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => onSelect(image.url, image)}
                        className="group border border-gray-200 rounded-lg overflow-hidden bg-white transition-colors text-left hover:border-red-300"
                        title="Выбрать изображение"
                      >
                        {cardContent}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={image.id}
                      className="group border border-gray-200 rounded-lg overflow-hidden bg-white"
                      title={image.fileName}
                    >
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Превью</th>
                      <th className="px-3 py-2 text-left">Файл</th>
                      <th className="px-3 py-2 text-left">Тип</th>
                      <th className="px-3 py-2 text-left">Размер</th>
                      <th className="px-3 py-2 text-left">Дата</th>
                      <th className="px-3 py-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredImages.map((image) => (
                      <tr key={image.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <img
                            src={getOptimizedImageUrl(image.url, { width: 120, quality: 60, format: 'webp' })}
                            alt={image.fileName}
                            className="h-14 w-24 rounded object-cover bg-gray-100"
                            loading="lazy"
                            decoding="async"
                          />
                        </td>
                        <td className="px-3 py-2 max-w-[260px] truncate" title={image.fileName}>
                          {image.fileName}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{image.contentType}</td>
                        <td className="px-3 py-2 text-gray-600">{formatBytes(image.sizeBytes)}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {new Date(image.createdAt).toLocaleString('ru-RU')}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {onSelect && (
                              <button
                                type="button"
                                onClick={() => onSelect(image.url, image)}
                                className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                Выбрать
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => copyImageUrl(image.url)}
                              className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                              title="Копировать ссылку"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            {allowDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(image)}
                                className="rounded p-1.5 text-red-600 hover:bg-red-50"
                                title="Удалить"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Показано {filteredImages.length} из {images.length}</span>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => loadImages()}
                  className="text-xs text-red-600 hover:text-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Загрузка...' : 'Показать ещё'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        tone={notification.tone}
        onClose={() => setNotification((prev) => ({ ...prev, isOpen: false }))}
      />

      <NotificationModal
        isOpen={Boolean(imageToDelete)}
        title="Удаление изображения"
        message={
          imageToDelete
            ? `Удалить изображение "${imageToDelete.fileName}"?`
            : ''
        }
        tone="info"
        showToneLabel={false}
        actions={(
          <>
            <button
              type="button"
              onClick={() => setImageToDelete(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Удалить
            </button>
          </>
        )}
        onClose={() => setImageToDelete(null)}
      />
    </>
  );
}
