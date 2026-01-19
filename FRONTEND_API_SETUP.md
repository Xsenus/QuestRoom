# Настройка фронтенда для работы с C# API

## Обзор изменений

Фронтенд теперь использует C# API вместо прямого подключения к базе данных. Все запросы идут через `/api/*` endpoints.

## Настройка

### 1. Обновите .env файл

Создайте или обновите файл `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Для production:

```env
VITE_API_URL=https://your-api-domain.com/api
```

Также можно использовать разные файлы окружения:

```bash
# Для разработки
cp .env.development.example .env
```

### 2. Установите зависимости

```bash
npm install
```

### 3. Запустите фронтенд

```bash
npm run dev
```

## Изменения в коде

### Новый API клиент

Создан новый файл `src/lib/api.ts` с методами для работы с C# API:

```typescript
import { api } from '../lib/api';

// Примеры использования:
const quests = await api.getQuests();
const quest = await api.getQuest(id);
await api.createBooking(bookingData);
```

### Обновленный AuthContext

`AuthContext` теперь использует JWT токены вместо внешнего провайдера авторизации:

- Токены хранятся в localStorage
- Авторизация через `api.login()`
- Автоматическое добавление токена в заголовки запросов

### Как обновить компоненты

#### Старый код (прямой доступ к БД):

```typescript
import { dbClient } from '../lib/dbClient';

const { data, error } = await dbClient
  .from('quests')
  .select('*')
  .eq('is_visible', true);
```

#### Новый код (API):

```typescript
import { api } from '../lib/api';

const data = await api.getQuests(true);
```

## Примеры обновления компонентов

### Загрузка данных

**Было:**
```typescript
const { data, error } = await dbClient
  .from('rules')
  .select('*')
  .eq('is_visible', true)
  .order('sort_order', { ascending: true });

if (error) {
  console.error('Error:', error);
} else {
  setRules(data || []);
}
```

**Стало:**
```typescript
try {
  const data = await api.getRules(true);
  setRules(data);
} catch (error) {
  console.error('Error:', error);
}
```

### Создание данных

**Было:**
```typescript
const { error } = await dbClient.from('rules').insert([rule]);
if (error) {
  alert('Ошибка: ' + error.message);
}
```

**Стало:**
```typescript
try {
  await api.createRule(rule);
} catch (error) {
  alert('Ошибка: ' + (error as Error).message);
}
```

### Обновление данных

**Было:**
```typescript
const { error } = await dbClient
  .from('rules')
  .update(rule)
  .eq('id', rule.id);
```

**Стало:**
```typescript
await api.updateRule(rule.id, rule);
```

### Удаление данных

**Было:**
```typescript
const { error } = await dbClient
  .from('rules')
  .delete()
  .eq('id', id);
```

**Стало:**
```typescript
await api.deleteRule(id);
```

## API Методы

### Авторизация
- `api.login(email, password)` - Вход
- `api.logout()` - Выход
- `api.isAuthenticated()` - Проверка авторизации
- `api.getUserRole()` - Получить роль пользователя

### Квесты
- `api.getQuests(visible?)` - Получить квесты
- `api.getQuest(id)` - Получить квест
- `api.createQuest(quest)` - Создать квест (admin)
- `api.updateQuest(id, quest)` - Обновить квест (admin)
- `api.deleteQuest(id)` - Удалить квест (admin)

### Расписание
- `api.getQuestSchedule(questId, fromDate?, toDate?)` - Получить расписание
- `api.createScheduleSlot(slot)` - Создать слот (admin)
- `api.updateScheduleSlot(id, slot)` - Обновить слот (admin)

### Бронирования
- `api.getBookings()` - Получить все бронирования (admin)
- `api.createBooking(booking)` - Создать бронирование
- `api.updateBooking(id, booking)` - Обновить (admin)
- `api.deleteBooking(id)` - Удалить (admin)

### Контент (Rules, Reviews, Promotions, Certificates)
- `api.getRules(visible?)`
- `api.createRule(rule)`
- `api.updateRule(id, rule)`
- `api.deleteRule(id)`

Аналогично для Reviews, Promotions, Certificates

### Информация
- `api.getAboutInfo()` - Получить информацию о проекте
- `api.updateAboutInfo(about)` - Обновить (admin)
- `api.getSettings()` - Получить настройки
- `api.updateSettings(settings)` - Обновить (admin)

## Миграция существующих компонентов

### Компоненты которые нужно обновить:

1. **HomePage** - использует api.getQuests()
2. **QuestDetailPage** - использует api.getQuest() и api.getQuestSchedule()
3. **BookingModal** - использует api.createBooking()
4. **AboutPage** - использует api.getAboutInfo()
5. **RulesPage** - использует api.getRules()
6. **CertificatePage** - использует api.getCertificates()
7. **ReviewsPage** - использует api.getReviews()
8. **PromotionsPage** - использует api.getPromotions()

### Все админские страницы:
- **Admin/QuestsPage** - CRUD операции с квестами
- **Admin/BookingsPage** - управление бронированиями
- **Admin/RulesPage** - управление правилами
- **Admin/ReviewsPage** - управление отзывами
- **Admin/PromotionsPage** - управление акциями
- **Admin/CertificatesPage** - управление сертификатами
- **Admin/AboutPage** - редактирование информации
- **Admin/SettingsPage** - редактирование настроек

## Типы данных

Все типы (Quest, Rule, Review, etc.) находятся в `src/lib/types.ts`.

## Безопасность

- JWT токены автоматически добавляются к запросам
- Токены действительны 24 часа
- После истечения токена нужна повторная авторизация
- Все admin endpoints защищены на уровне API

## Отладка

### Проверка токена

```javascript
console.log(localStorage.getItem('auth_token'));
```

### Проверка ошибок API

Все ошибки выбрасываются как исключения:

```typescript
try {
  await api.createRule(rule);
} catch (error) {
  console.error('API Error:', error);
}
```

## Production

Для production сборки:

1. Обновите `VITE_API_URL` в `.env.production`
2. Соберите проект: `npm run build`
3. Разверните файлы из папки `dist/`

## Troubleshooting

### CORS ошибки

Если видите CORS ошибки, убедитесь что:
1. C# API запущен
2. В appsettings.json или appsettings.Production.json настроены Cors:AllowedOrigins
3. Фронтенд использует правильный API_URL

### 401 Unauthorized

Проверьте:
1. Авторизованы ли вы (есть ли токен в localStorage)
2. Не истек ли токен (срок действия 24 часа)
3. Правильная ли роль у пользователя для данного endpoint
