# Quest Room API

C# ASP.NET Core Web API для управления квест-комнатами.

## Требования

- .NET 9.0 SDK
- PostgreSQL

## Установка и запуск

### 1. Установка зависимостей

```bash
cd api
dotnet restore
```

### 2. Настройка appsettings.json

Откройте `appsettings.json` и настройте:

- **ConnectionString**: Укажите данные подключения к PostgreSQL
- **Jwt:Key**: Сгенерируйте секретный ключ (минимум 32 символа)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=questroom;Username=postgres;Password=ваш_пароль"
  },
  "AdminUser": {
    "Email": "admin@questroom.local",
    "Password": "admin12345"
  },
  "Cors": {
    "AllowAnyOrigin": false,
    "AllowedOrigins": [
      "http://localhost:5173"
    ]
  },
  "Swagger": {
    "Enabled": true
  },
  "Jwt": {
    "Key": "ваш_секретный_ключ_минимум_32_символа",
    "Issuer": "QuestRoomApi",
    "Audience": "QuestRoomClient"
  }
}
```

### 3. Создание первого администратора

Администратор создается автоматически при первом запуске API. Данные берутся из секции `AdminUser` в `appsettings.json`
(можно переопределить через переменные окружения).

### 4. Запуск API

```bash
dotnet run
```

API будет доступно по адресу: `http://localhost:5000`

Swagger UI: `http://localhost:5000/swagger`

## API Endpoints

### Авторизация

- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/register-admin` - Регистрация администратора (одноразовая)

### Квесты

- `GET /api/quests` - Получить список квестов
- `GET /api/quests/{id}` - Получить квест по ID
- `POST /api/quests` - Создать квест (требуется авторизация admin)
- `PUT /api/quests/{id}` - Обновить квест (требуется авторизация admin)
- `DELETE /api/quests/{id}` - Удалить квест (требуется авторизация admin)
- `GET /api/durationbadges` - Получить список бейджей длительности

### Расписание

- `GET /api/schedule/quest/{questId}` - Получить расписание квеста
- `POST /api/schedule` - Создать слот расписания (требуется авторизация admin)
- `POST /api/schedule/generate` - Сгенерировать слоты по правилам цен (admin)
- `PUT /api/schedule/{id}` - Обновить слот (требуется авторизация admin)

### Ценовые правила

- `GET /api/pricingrules` - Получить правила (можно фильтровать по questId)
- `POST /api/pricingrules` - Создать правило (admin)
- `PUT /api/pricingrules/{id}` - Обновить правило (admin)
- `DELETE /api/pricingrules/{id}` - Удалить правило (admin)

### Изображения

- `POST /api/images` - Загрузить изображение в базу (admin)
- `GET /api/images/{id}` - Получить изображение по ID

### Бронирования

- `GET /api/bookings` - Получить все бронирования (требуется авторизация admin)
- `POST /api/bookings` - Создать бронирование (публичный доступ)
- `PUT /api/bookings/{id}` - Обновить бронирование (требуется авторизация admin)
- `DELETE /api/bookings/{id}` - Удалить бронирование (требуется авторизация admin)

### Контент

- `GET /api/rules` - Получить правила
- `POST /api/rules` - Создать правило (требуется авторизация admin)
- `PUT /api/rules/{id}` - Обновить правило (требуется авторизация admin)
- `DELETE /api/rules/{id}` - Удалить правило (требуется авторизация admin)

Аналогично для:
- `/api/reviews` - Отзывы
- `/api/promotions` - Акции
- `/api/certificates` - Сертификаты
- `/api/about` - Информация о проекте
- `/api/settings` - Настройки сайта

## Авторизация

API использует JWT токены. После успешного входа вы получите токен:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "admin@questroom.ru",
  "role": "admin"
}
```

Используйте этот токен в заголовке Authorization для защищенных endpoints:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Структура проекта

```
api/
├── Controllers/          # API контроллеры
├── Models/              # Модели данных
├── Data/                # DbContext
├── Services/            # Бизнес-логика
├── DTOs/                # Data Transfer Objects
├── Program.cs           # Точка входа
└── appsettings.json     # Конфигурация
```

## Разработка

### Swagger UI

Swagger включен по умолчанию (или всегда в Development). При необходимости можно принудительно включить через `Swagger:Enabled=true`
в `appsettings.json`. UI доступен по адресу: `http://localhost:5000/swagger`

### Подключение к БД

API подключается напрямую к PostgreSQL базе. При запуске автоматически применяются миграции/создается схема и добавляются базовые данные.

### Безопасность

- Пароли хешируются с использованием BCrypt
- JWT токены действительны 24 часа
- Все admin endpoints защищены авторизацией
- CORS настроен только для localhost во время разработки. Для тестирования можно временно включить `Cors:AllowAnyOrigin=true`.
