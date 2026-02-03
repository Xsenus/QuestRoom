import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { BookingImportIssue, BookingImportResult } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';
import AccessDenied from '../../components/admin/AccessDenied';

type ImportProgress = {
  total: number;
  processed: number;
};

const normalizeContent = (content: string) => {
  if (!content.includes('\n') && content.includes('\\n')) {
    return content.replace(/\\n/g, '\n');
  }
  return content;
};

const countImportRows = (content: string) => {
  const normalized = normalizeContent(content).replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  let headerFound = false;
  let count = 0;
  for (const line of lines) {
    if (!headerFound) {
      if (line.trim()) {
        headerFound = true;
      }
      continue;
    }
    if (line.trim()) {
      count += 1;
    }
  }
  return count;
};

const renderIssues = (items: BookingImportIssue[], title: string) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
      <p className="font-semibold">{title}</p>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-amber-200 bg-white text-xs">
        <table className="min-w-full">
          <thead className="bg-amber-100 text-amber-900">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Строка</th>
              <th className="px-3 py-2 text-left font-semibold">Legacy Id</th>
              <th className="px-3 py-2 text-left font-semibold">Причина</th>
            </tr>
          </thead>
          <tbody>
            {items.map((issue, index) => (
              <tr key={`${issue.rowNumber}-${issue.reason}-${index}`} className="border-t border-amber-100">
                <td className="px-3 py-2">{issue.rowNumber || '—'}</td>
                <td className="px-3 py-2">{issue.legacyId ?? '—'}</td>
                <td className="px-3 py-2">{issue.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function BookingsImportPage() {
  const { hasPermission } = useAuth();
  const canImport = hasPermission('bookings.import');
  const [importContent, setImportContent] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importResult, setImportResult] = useState<BookingImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({ total: 0, processed: 0 });

  const pendingTotal = useMemo(() => countImportRows(importContent), [importContent]);

  if (!canImport) {
    return <AccessDenied />;
  }

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImportContent(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handleImportBookings = async () => {
    if (!importContent.trim()) {
      setImportError('Добавьте файл или вставьте содержимое для импорта.');
      return;
    }
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);
    setProgress({ total: pendingTotal, processed: 0 });

    try {
      const result = await api.importBookings(importContent);
      setImportResult(result);
      setProgress({
        total: result.totalRows || pendingTotal,
        processed: result.processed || result.imported + result.skipped + result.duplicates,
      });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Ошибка импорта.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setImportContent('');
    setImportFileName('');
    setImportResult(null);
    setImportError(null);
    setProgress({ total: 0, processed: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Импорт бронирований</h2>
          <p className="text-sm text-gray-500">
            Поддерживаются файлы CSV или TXT с разделителями “;” или табуляцией.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-sm font-semibold text-gray-500 hover:text-gray-700"
        >
          Очистить
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Файл</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleImportFileChange}
                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
              />
            </label>
            {importFileName && (
              <div className="text-xs text-gray-500">Выбран файл: {importFileName}</div>
            )}
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">
                Содержимое (можно вставить вручную)
              </span>
              <textarea
                value={importContent}
                onChange={(event) => setImportContent(event.target.value)}
                rows={8}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                placeholder="Вставьте содержимое CSV/TXT сюда."
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>Строк к импорту: {pendingTotal}</span>
              {isImporting && (
                <span className="flex items-center gap-2 text-gray-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  Обработано {progress.processed} из {progress.total || pendingTotal}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleImportBookings}
              disabled={isImporting}
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImporting ? 'Импортируем…' : 'Импортировать'}
            </button>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-800">Правила импорта</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600">
              <li>Пустые строки пропускаются, как и записи без телефона и e-mail.</li>
              <li>Дубликаты по старому Id не создаются повторно.</li>
              <li>Оплата “3” сохраняется как агрегатор “mir-kvestov”.</li>
            </ul>
            {importResult && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
                <p className="font-semibold">Импорт завершён</p>
                <p>Строк всего: {importResult.totalRows}</p>
                <p>Импортировано: {importResult.imported}</p>
                <p>Пропущено: {importResult.skipped}</p>
                <p>Дубликатов: {importResult.duplicates}</p>
                <p>Обработано: {importResult.processed}</p>
              </div>
            )}
            {importError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                {importError}
              </div>
            )}
          </div>
        </div>
        {importResult && (
          <div className="mt-6">
            {renderIssues(importResult.skippedRows, 'Пропущенные строки')}
            {renderIssues(importResult.duplicateRows, 'Дубликаты')}
          </div>
        )}
      </div>
    </div>
  );
}
