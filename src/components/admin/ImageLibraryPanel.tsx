import { useEffect, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '../../lib/imageOptimizations';
import { ImageAsset } from '../../lib/types';

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

const IMAGE_LIBRARY_PAGE_SIZE = 10;

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
      alert('Ошибка загрузки библиотеки изображений: ' + (error as Error).message);
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
    } catch (error) {
      alert('Ошибка загрузки изображения: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (image: ImageAsset) => {
    if (!confirm(`Удалить изображение "${image.fileName}"?`)) return;
    try {
      await api.deleteImage(image.id);
      setImages((prev) => prev.filter((item) => item.id !== image.id));
    } catch (error) {
      alert('Ошибка удаления изображения: ' + (error as Error).message);
    }
  };

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

  return (
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
            <div className="flex flex-wrap items-center gap-3">
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
          {images.length === 0 && !isLoading ? (
            <p className="text-sm text-gray-500">{emptyText}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((image) => {
                const cardContent = (
                  <>
                    <div className="relative aspect-video bg-gray-100">
                      <img
                        src={getOptimizedImageUrl(image.url, { width: 360 })}
                        srcSet={getResponsiveSrcSet(image.url, [180, 240, 360, 480])}
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
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate">{image.fileName}</p>
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
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Показано {images.length}</span>
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
  );
}
