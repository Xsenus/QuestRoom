import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Certificate, CertificateUpsert } from '../../lib/types';
import { Plus, Edit, Eye, EyeOff, Trash2, Save, X } from 'lucide-react';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCert, setEditingCert] = useState<
    (CertificateUpsert & { id?: string }) | null
  >(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      const data = await api.getCertificates();
      setCertificates(data || []);
    } catch (error) {
      console.error('Error loading certificates:', error);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingCert({
      title: '',
      description: '',
      imageUrl: '',
      issuedDate: new Date().toISOString().split('T')[0],
      sortOrder: certificates.length,
      isVisible: true,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingCert) return;

    const { id, ...payload } = editingCert;

    try {
      if (isCreating) {
        await api.createCertificate(payload);
      } else if (id) {
        await api.updateCertificate(id, payload);
      }
    } catch (error) {
      alert('Ошибка при сохранении сертификата: ' + (error as Error).message);
      return;
    }

    setEditingCert(null);
    setIsCreating(false);
    loadCertificates();
  };

  const handleCancel = () => {
    setEditingCert(null);
    setIsCreating(false);
  };

  const handleToggleVisibility = async (cert: Certificate) => {
    try {
      const { id, createdAt, updatedAt, ...payload } = cert;
      await api.updateCertificate(id, { ...payload, isVisible: !cert.isVisible });
      loadCertificates();
    } catch (error) {
      alert('Ошибка при изменении видимости: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот сертификат?')) return;

    try {
      await api.deleteCertificate(id);
      loadCertificates();
    } catch (error) {
      alert('Ошибка при удалении сертификата: ' + (error as Error).message);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (editingCert) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            {isCreating ? 'Добавление сертификата' : 'Редактирование сертификата'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Название сертификата
              </label>
              <input
                type="text"
                value={editingCert.title || ''}
                onChange={(e) =>
                  setEditingCert({ ...editingCert, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Сертификат ISO 9001"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Описание
              </label>
              <textarea
                value={editingCert.description || ''}
                onChange={(e) =>
                  setEditingCert({ ...editingCert, description: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Описание сертификата..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL изображения
              </label>
              <input
                type="text"
                value={editingCert.imageUrl || ''}
                onChange={(e) =>
                  setEditingCert({ ...editingCert, imageUrl: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="/images/certificates/cert1.jpg"
              />
              {editingCert.imageUrl && (
                <img
                  src={editingCert.imageUrl}
                  alt="Preview"
                  className="mt-3 max-w-xs rounded-lg border"
                />
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Дата выдачи
                </label>
                <input
                  type="date"
                  value={editingCert.issuedDate || ''}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, issuedDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={editingCert.sortOrder || 0}
                  onChange={(e) =>
                    setEditingCert({
                      ...editingCert,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCert.isVisible !== false}
                  onChange={(e) =>
                    setEditingCert({ ...editingCert, isVisible: e.target.checked })
                  }
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Показывать на сайте
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Save className="w-5 h-5" />
                Сохранить
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <X className="w-5 h-5" />
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Управление сертификатами</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить сертификат
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className={`bg-white rounded-lg shadow-lg p-6 ${
              !cert.isVisible ? 'opacity-60' : ''
            }`}
          >
            {cert.imageUrl && (
              <img
                src={cert.imageUrl}
                alt={cert.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{cert.title}</h3>
              {!cert.isVisible && (
                <span className="bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-full">
                  СКРЫТ
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-2">{cert.description}</p>
            <p className="text-gray-500 text-xs mb-4">
              Дата выдачи: {new Date(cert.issuedDate).toLocaleDateString('ru-RU')}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingCert(cert)}
                className="flex-1 p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                title="Редактировать"
              >
                <Edit className="w-5 h-5 mx-auto" />
              </button>
              <button
                onClick={() => handleToggleVisibility(cert)}
                className="flex-1 p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                title={cert.isVisible ? 'Скрыть' : 'Показать'}
              >
                {cert.isVisible ? (
                  <Eye className="w-5 h-5 mx-auto" />
                ) : (
                  <EyeOff className="w-5 h-5 mx-auto" />
                )}
              </button>
              <button
                onClick={() => handleDelete(cert.id)}
                className="flex-1 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-5 h-5 mx-auto" />
              </button>
            </div>
          </div>
        ))}

        {certificates.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">Сертификаты не найдены</p>
            <p className="text-gray-500 mt-2">Добавьте первый сертификат</p>
          </div>
        )}
      </div>
    </div>
  );
}
