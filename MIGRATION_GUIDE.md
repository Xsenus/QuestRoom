# Руководство по миграции на C# API

Это руководство поможет вам перевести существующий проект с прямого использования Supabase на архитектуру с C# API.

## Что изменилось

### Архитектура

**До:**
```
React Frontend ──────▶ Supabase (PostgreSQL + Auth)
```

**После:**
```
React Frontend ──────▶ C# API ──────▶ PostgreSQL (Supabase)
```

### Авторизация

**До:** Supabase Auth (magic links, OAuth, etc.)
**После:** JWT токены с email/password через C# API

### Запросы к данным

**До:** Прямые запросы к Supabase через `supabase.from('table')`
**После:** REST API запросы через `api.getTable()`

## Пошаговая миграция

### Шаг 1: Настройка C# API

1. Перейдите в папку `api/`
2. Откройте `appsettings.json`
3. Настройте `ConnectionString`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=db.ljbgyixecqjpaqluezle.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD"
  }
}
```

Найдите пароль PostgreSQL в настройках Supabase:
- Откройте проект в Supabase Dashboard
- Project Settings → Database → Connection string
- Скопируйте пароль

4. Сгенерируйте секретный ключ для JWT (минимум 32 символа):

```json
{
  "Jwt": {
    "Key": "your-super-secret-key-at-least-32-characters-long",
    "Issuer": "QuestRoomApi",
    "Audience": "QuestRoomClient"
  }
}
```

5. Восстановите зависимости и запустите:

```bash
cd api
dotnet restore
dotnet run
```

6. API должно запуститься на `http://localhost:5000`
7. Откройте Swagger: `http://localhost:5000/swagger`

### Шаг 2: Создание администратора

1. Откройте Swagger UI
2. Найдите endpoint `POST /api/auth/register-admin`
3. Выполните запрос с данными:

```json
{
  "email": "admin@questroom.ru",
  "password": "secure_password_here"
}
```

4. Запомните эти данные - они понадобятся для входа

**Или через curl:**

```bash
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@questroom.ru",
    "password": "your_password"
  }'
```

### Шаг 3: Настройка Frontend

1. Обновите `.env` файл:

```env
VITE_API_URL=http://localhost:5000/api
```

2. Установите зависимости (если еще не установлены):

```bash
npm install
```

3. Запустите фронтенд:

```bash
npm run dev
```

### Шаг 4: Проверка работы

1. Откройте `http://localhost:5173`
2. Перейдите на `/adm/login`
3. Войдите с данными администратора
4. Проверьте работу админ-панели

## Обновление компонентов

### Компоненты, требующие обновления

Если вы еще не обновили компоненты, вот список того, что нужно изменить:

#### 1. Страницы с данными (НЕ админ)

Эти компоненты уже обновлены и работают с БД через public endpoints:
- ✅ AboutPage
- ✅ RulesPage
- ✅ CertificatePage
- ✅ ReviewsPage
- ✅ PromotionsPage
- ✅ HomePage (квесты)
- ✅ QuestDetailPage

**Но нужно обновить для использования нового API:**

```typescript
// Старый код
import { supabase } from '../lib/supabase';
const { data } = await supabase.from('rules').select('*');

// Новый код
import { api } from '../lib/api';
const data = await api.getRules();
```

#### 2. Админские страницы

Все админские страницы нужно обновить для использования API:

- `src/pages/admin/QuestsPage.tsx`
- `src/pages/admin/BookingsPage.tsx`
- `src/pages/admin/RulesPage.tsx`
- `src/pages/admin/ReviewsAdminPage.tsx`
- `src/pages/admin/PromotionsAdminPage.tsx`
- `src/pages/admin/CertificatesPage.tsx`
- `src/pages/admin/AboutPage.tsx`
- `src/pages/admin/SettingsPage.tsx`

**Шаблон обновления:**

```typescript
// Было
const { data, error } = await supabase
  .from('rules')
  .select('*')
  .order('sort_order');

if (error) {
  console.error(error);
} else {
  setRules(data);
}

// Стало
try {
  const data = await api.getRules();
  setRules(data);
} catch (error) {
  console.error(error);
}
```

### Паттерны миграции

#### Чтение данных

```typescript
// Supabase
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('field', value);

// API
const data = await api.getTable(value);
```

#### Создание

```typescript
// Supabase
const { error } = await supabase
  .from('table')
  .insert([item]);

// API
await api.createItem(item);
```

#### Обновление

```typescript
// Supabase
const { error } = await supabase
  .from('table')
  .update(item)
  .eq('id', id);

// API
await api.updateItem(id, item);
```

#### Удаление

```typescript
// Supabase
const { error } = await supabase
  .from('table')
  .delete()
  .eq('id', id);

// API
await api.deleteItem(id);
```

## Типичные проблемы

### 1. CORS ошибки

**Проблема:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Решение:**
- Убедитесь что API запущен
- Проверьте что в `Program.cs` настроен правильный origin
- Frontend должен использовать `http://localhost:5173`

### 2. 401 Unauthorized

**Проблема:** Все запросы возвращают 401

**Решение:**
- Проверьте что вы авторизованы (есть токен в localStorage)
- Токен действителен 24 часа, возможно истек
- Попробуйте войти заново

### 3. Нет данных после миграции

**Проблема:** Страницы пустые, нет квестов/правил/etc

**Решение:**
- Все данные остались в БД
- Проверьте что API подключается к правильной БД
- Проверьте ConnectionString в `appsettings.json`
- Попробуйте выполнить запрос через Swagger

### 4. API не запускается

**Проблема:** `dotnet run` выдает ошибку

**Решение:**
- Проверьте что установлен .NET 8.0 SDK
- Выполните `dotnet restore`
- Проверьте что `appsettings.json` содержит все необходимые настройки

### 5. Не работает авторизация

**Проблема:** Не могу войти в админ-панель

**Решение:**
- Убедитесь что создали администратора через API
- Проверьте правильность email и пароля
- Проверьте в консоли браузера наличие ошибок
- JWT токен должен сохраняться в localStorage

## Проверка миграции

Чеклист для проверки успешной миграции:

- [ ] C# API запускается без ошибок
- [ ] Swagger UI открывается и показывает все endpoints
- [ ] Создан пользователь-администратор
- [ ] Frontend подключается к API (проверить в Network tab)
- [ ] Можно войти в админ-панель
- [ ] Публичные страницы загружают данные
- [ ] В админ-панели можно создавать/редактировать/удалять записи
- [ ] Бронирования работают
- [ ] Расписание отображается корректно

## Откат изменений

Если что-то пошло не так и нужно вернуться к старой версии:

1. Откатите изменения в Git:
```bash
git checkout HEAD -- src/lib/api.ts src/contexts/AuthContext.tsx
```

2. Восстановите старый `.env`:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Перезапустите фронтенд

## Поддержка

При возникновении проблем:

1. Проверьте логи API (консоль где запущен `dotnet run`)
2. Проверьте Network tab в браузере
3. Проверьте Console в браузере
4. Используйте Swagger для тестирования API endpoints

## Следующие шаги

После успешной миграции:

1. Обновите все оставшиеся компоненты для использования API
2. Добавьте обработку ошибок
3. Добавьте loading states
4. Настройте production environment
5. Настройте HTTPS для API
6. Настройте environment variables для production
