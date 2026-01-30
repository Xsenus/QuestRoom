# Quest Room - Система управления квест-комнатами

Полнофункциональная система для управления квест-комнатами с C# API бэкендом и React фронтендом.

## Архитектура

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React         │────────▶│   C# API         │────────▶│   PostgreSQL    │
│   Frontend      │         │   (.NET 9)       │         │   Database      │
│   (Vite)        │◀────────│   REST API       │◀────────│                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

### Компоненты системы:

1. **Frontend (React + TypeScript + Vite)**
   - Публичная часть сайта
   - Административная панель
   - JWT авторизация

2. **Backend (C# ASP.NET Core Web API)**
   - REST API endpoints
   - JWT authentication
   - Entity Framework Core
   - Swagger documentation

3. **Database (PostgreSQL)**
   - Данные квестов
   - Расписание и бронирования
   - Контент (правила, отзывы, акции и т.д.)
   - Пользователи системы

## Быстрый старт

### Предварительные требования

- Node.js 18+ и npm
- .NET 9.0 SDK
- PostgreSQL

### 1. Настройка базы данных

При старте API автоматически применяются миграции (или создается схема) и добавляются базовые данные.

### 2. Запуск C# API

```bash
# Перейдите в папку API
cd api

# Восстановите зависимости
dotnet restore

# Настройте appsettings.json
# - Укажите строку подключения к PostgreSQL
# - Сгенерируйте секретный ключ для JWT

# Создайте первого администратора
# (после запуска API, см. инструкции ниже)

# Запустите API
dotnet run
```

API будет доступно по адресу: `http://localhost:5000`

Swagger UI: `http://localhost:5000/swagger`

#### Создание администратора

Администратор создается автоматически при первом запуске API. Настройки берутся из `api/appsettings.json`
в секции `AdminUser` (можно переопределить через переменные окружения).

### 3. Запуск Frontend

```bash
# В корневой папке проекта
npm install

# Создайте .env файл (можно взять пример из .env.example)
cp .env.example .env

# Запустите фронтенд
npm run dev
```

Фронтенд будет доступен по адресу: `http://localhost:5173`

### Прокси /api для разработки

Если вы открываете API через фронтенд-хост (например, `http://localhost:5173/api/...`), Vite dev server
проксирует запросы на API. Адрес API задаётся переменной `VITE_API_PROXY_TARGET` (по умолчанию `http://localhost:3001`).

Пример `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_API_PROXY_TARGET=http://localhost:3001
```

## Вход в админ-панель

1. Откройте `http://localhost:5173/adm/login`
2. Введите email и пароль администратора
3. После успешного входа вы попадете в админ-панель

## Структура проекта

```
quest-room/
├── api/                          # C# API проект
│   ├── Controllers/              # API контроллеры
│   ├── Models/                   # Модели данных
│   ├── Data/                     # DbContext
│   ├── Services/                 # Бизнес-логика
│   ├── DTOs/                     # Data Transfer Objects
│   ├── Program.cs                # Точка входа
│   ├── appsettings.json          # Конфигурация
│   └── README.md                 # API документация
│
├── src/                          # Frontend исходники
│   ├── components/               # React компоненты
│   ├── pages/                    # Страницы
│   │   └── admin/                # Админ-панель
│   ├── contexts/                 # React контексты
│   ├── lib/                      # Утилиты
│   │   ├── api.ts                # API клиент
│   │   └── types.ts              # Типы данных
│   └── App.tsx                   # Главный компонент
│
└── public/                       # Статические файлы
```

## Основные функции

### Публичная часть

- ✅ Просмотр доступных квестов
- ✅ Детальная информация о квесте
- ✅ Расписание квестов на 2 недели
- ✅ Онлайн бронирование
- ✅ Правила участия
- ✅ Отзывы клиентов
- ✅ Акции и сертификаты
- ✅ Информация о компании

### Административная панель

- ✅ Управление квестами (CRUD)
- ✅ Управление расписанием
- ✅ Просмотр и управление бронированиями
- ✅ Редактирование правил
- ✅ Управление отзывами
- ✅ Управление акциями
- ✅ Управление сертификатами
- ✅ Редактирование информации о проекте
- ✅ Настройки сайта

## API Endpoints

### Авторизация
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/register-admin` - Регистрация админа (одноразовая)

### Квесты
- `GET /api/quests` - Список квестов
- `GET /api/quests/{id}` - Детали квеста
- `POST /api/quests` - Создать квест (admin)
- `PUT /api/quests/{id}` - Обновить квест (admin)
- `DELETE /api/quests/{id}` - Удалить квест (admin)
- `GET /api/durationbadges` - Бейджи длительности

### Расписание
- `GET /api/schedule/quest/{questId}` - Расписание квеста
- `POST /api/schedule` - Создать слот (admin)
- `PUT /api/schedule/{id}` - Обновить слот (admin)

### Бронирования
- `GET /api/bookings` - Все бронирования (admin)
- `POST /api/bookings` - Создать бронирование
- `PUT /api/bookings/{id}` - Обновить (admin)
- `DELETE /api/bookings/{id}` - Удалить (admin)

### Контент
- `/api/rules` - Правила
- `/api/reviews` - Отзывы
- `/api/promotions` - Акции
- `/api/certificates` - Сертификаты
- `/api/about` - О проекте
- `/api/settings` - Настройки

Полная документация API доступна в Swagger: `http://localhost:5000/swagger`

## Примеры запросов к API

> В примерах ниже замените `BASE_URL` на ваш домен API (например, `http://localhost:3001` или `https://vlovushke24.ru`).

### Авторизация

```bash
curl -X POST BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@questroom.local","password":"admin12345"}'
```

### Квесты

```bash
curl BASE_URL/api/quests
curl BASE_URL/api/quests/{questId}
```

```bash
curl -X POST BASE_URL/api/quests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Новый квест","slug":"new-quest","price":3500,"duration":60,"participantsMin":2,"participantsMax":4}'
```

```bash
curl -X PUT BASE_URL/api/quests/{questId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Обновлённый квест","slug":"new-quest","price":3500,"duration":60,"participantsMin":2,"participantsMax":4}'
```

```bash
curl -X DELETE BASE_URL/api/quests/{questId} \
  -H "Authorization: Bearer <TOKEN>"
```

### Расписание

```bash
curl "BASE_URL/api/schedule/quest/{questId}?fromDate=2025-01-01&toDate=2025-01-14"
```

```bash
curl -X POST BASE_URL/api/schedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"questId":"{questId}","date":"2025-01-05","timeSlot":"18:30","price":3500,"isBooked":false}'
```

```bash
curl -X PUT BASE_URL/api/schedule/{slotId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"questId":"{questId}","date":"2025-01-05","timeSlot":"18:30","price":3500,"isBooked":false}'
```

### Бронирования

```bash
curl -X POST BASE_URL/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"questId":"{questId}","questScheduleId":"{slotId}","customerName":"Иван Петров","customerPhone":"+7 900 000-00-00","customerEmail":"test@mail.ru","bookingDate":"2025-01-05","participantsCount":4,"notes":"Комментарий"}'
```

```bash
curl BASE_URL/api/bookings \
  -H "Authorization: Bearer <TOKEN>"
```

```bash
curl -X PUT BASE_URL/api/bookings/{bookingId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"status":"confirmed","notes":"Подтверждено"}'
```

```bash
curl -X DELETE BASE_URL/api/bookings/{bookingId} \
  -H "Authorization: Bearer <TOKEN>"
```

### Контент (пример для правил)

```bash
curl BASE_URL/api/rules
```

```bash
curl -X POST BASE_URL/api/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Новый пункт","content":"Описание","sortOrder":1,"isVisible":true}'
```

```bash
curl -X PUT BASE_URL/api/rules/{ruleId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Обновлённый пункт","content":"Описание","sortOrder":1,"isVisible":true}'
```

```bash
curl -X DELETE BASE_URL/api/rules/{ruleId} \
  -H "Authorization: Bearer <TOKEN>"
```

### Mir-kvestov интеграция

```bash
curl BASE_URL/api/mir-kvestov/alice
curl BASE_URL/api/mir-kvestov/alice.json
```

```bash
curl -X POST BASE_URL/api/mir-kvestov/alice/order \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "first_name=Иван" \
  -d "family_name=Петров" \
  -d "phone=+7%20900%20000-00-00" \
  -d "email=test@mail.ru" \
  -d "date=2025-01-05" \
  -d "time=18:30" \
  -d "price=3500" \
  -d "unique_id=abc123" \
  -d "your_slot_id={slotId}"
```

```bash
curl "BASE_URL/api/mir-kvestov/alice/get_price?date=2025-01-05&time=18:30"
```

```bash
curl "BASE_URL/api/mir-kvestov/alice/prepay?md5=HASH&unique_id=abc123&prepay=3000"
```

## Безопасность

- ✅ JWT авторизация
- ✅ Пароли хешируются с BCrypt
- ✅ Role-based доступ (admin/user)
- ✅ CORS защита
- ✅ Защита admin endpoints

## База данных

Схема базы данных включает:

- `users` - Пользователи системы
- `quests` - Квесты
- `quest_schedule` - Расписание квестов
- `bookings` - Бронирования
- `rules` - Правила участия
- `reviews` - Отзывы клиентов
- `promotions` - Акции
- `certificates` - Сертификаты и награды
- `about_info` - Информация о проекте
- `settings` - Настройки сайта

## Разработка

### Запуск в режиме разработки

Терминал 1 - API:
```bash
cd api
dotnet watch run
```

Терминал 2 - Frontend:
```bash
npm run dev
```

> Для разных окружений используйте `.env.development.example` и `.env.production.example` на фронте,
> а для API настройте `Cors:AllowedOrigins` в `appsettings.json` или
> `appsettings.Production.json`.

### Сборка для production

Frontend:
```bash
npm run build
```

API:
```bash
cd api
dotnet publish -c Release
```

## Дополнительная документация

- [API Documentation](./api/README.md) - Подробная документация по C# API
- [Deploy на VPS (RU)](./docs/DEPLOYMENT.md) - Автоматический деплой на Ubuntu 22+

## Технологический стек

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- Lucide Icons

### Backend
- C# / .NET 9.0
- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL (Npgsql)
- JWT Bearer Authentication
- BCrypt.Net
- Swagger/OpenAPI

### Database
- PostgreSQL 15

## Лицензия

Proprietary - Все права защищены

## Поддержка

По вопросам и поддержке обращайтесь к разработчику.
