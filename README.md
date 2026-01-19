# Quest Room - Система управления квест-комнатами

Полнофункциональная система для управления квест-комнатами с C# API бэкендом и React фронтендом.

## Архитектура

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React         │────────▶│   C# API         │────────▶│   PostgreSQL    │
│   Frontend      │         │   (.NET 8)       │         │   (Supabase)    │
│   (Vite)        │◀────────│   REST API       │◀────────│   Database      │
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

3. **Database (PostgreSQL / Supabase)**
   - Данные квестов
   - Расписание и бронирования
   - Контент (правила, отзывы, акции и т.д.)
   - Пользователи системы

## Быстрый старт

### Предварительные требования

- Node.js 18+ и npm
- .NET 8.0 SDK
- PostgreSQL (Supabase)

### 1. Настройка базы данных

База данных уже настроена через Supabase миграции. Убедитесь, что все миграции применены.

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

После первого запуска API, создайте администратора через Swagger или curl:

```bash
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@questroom.ru",
    "password": "your_secure_password"
  }'
```

### 3. Запуск Frontend

```bash
# В корневой папке проекта
npm install

# Создайте .env файл
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Запустите фронтенд
npm run dev
```

Фронтенд будет доступен по адресу: `http://localhost:5173`

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
│   │   └── supabase.ts           # Типы данных
│   └── App.tsx                   # Главный компонент
│
├── supabase/                     # Миграции БД
│   └── migrations/               # SQL миграции
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
- [Frontend API Setup](./FRONTEND_API_SETUP.md) - Настройка фронтенда для работы с API

## Технологический стек

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- Lucide Icons

### Backend
- C# / .NET 8.0
- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL (Npgsql)
- JWT Bearer Authentication
- BCrypt.Net
- Swagger/OpenAPI

### Database
- PostgreSQL 15
- Supabase (hosting)

## Лицензия

Proprietary - Все права защищены

## Поддержка

По вопросам и поддержке обращайтесь к разработчику.
