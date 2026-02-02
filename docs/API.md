# Документация API QuestRoom (примеры запросов)

Ниже приведены основные публичные эндпоинты и примеры запросов для интеграций и фронтенда.
Форматы запросов указаны для `curl` и JSON, чтобы было проще повторить в Postman или другом клиенте.

> Базовый URL: `https://<ваш-домен>/api`

## 1) Получение расписания квеста

**GET** `/mir-kvestov/{questSlug}?from=YYYY-MM-DD&to=YYYY-MM-DD`

Пример:

```bash
curl "https://example.com/api/mir-kvestov/quest-slug?from=2026-01-10&to=2026-01-20"
```

Ответ:

```json
[
  {
    "date": "2026-01-10",
    "time": "18:30",
    "is_free": true,
    "price": 3000,
    "discount_price": null,
    "your_slot_id": "e2d56c7d-5a57-4a5f-b623-4c3c8ff7b944"
  }
]
```

`your_slot_id` возвращается в числовом формате `YYYYMMDDHHMM` по умолчанию. Можно переключить на GUID, выставив `MirKvestov:SlotIdFormat = guid`.

## 2) Бронирование слота (MirKvestov)

**POST** `/mir-kvestov/{questSlug}/order`

Поддерживаются `application/x-www-form-urlencoded` и `application/json`.

### Вариант 1: form-urlencoded

```bash
curl -X POST "https://example.com/api/mir-kvestov/quest-slug/order" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "first_name=Иван" \
  --data-urlencode "family_name=Иванов" \
  --data-urlencode "phone=+7 (900) 000-00-00" \
  --data-urlencode "email=ivan@example.com" \
  --data-urlencode "comment=Прошу перезвонить" \
  --data-urlencode "source=mir-kvestov.ru" \
  --data-urlencode "md5=abcdef1234567890abcdef1234567890" \
  --data-urlencode "date=2026-01-10" \
  --data-urlencode "time=18:30" \
  --data-urlencode "price=3500" \
  --data-urlencode "unique_id=mk-12345" \
  --data-urlencode "your_slot_id=e2d56c7d-5a57-4a5f-b623-4c3c8ff7b944" \
  --data-urlencode "players=4" \
  --data-urlencode "tariff=Базовый"
```

### Вариант 2: JSON

```bash
curl -X POST "https://example.com/api/mir-kvestov/quest-slug/order" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Иван",
    "family_name": "Иванов",
    "phone": "+7 (900) 000-00-00",
    "email": "ivan@example.com",
    "comment": "Прошу перезвонить",
    "source": "mir-kvestov.ru",
    "md5": "abcdef1234567890abcdef1234567890",
    "date": "2026-01-10",
    "time": "18:30",
    "price": 3500,
    "unique_id": "mk-12345",
    "your_slot_id": "e2d56c7d-5a57-4a5f-b623-4c3c8ff7b944",
    "players": 4,
    "tariff": "Базовый"
  }'
```

Успешный ответ:

```json
{"success": true}
```

Ошибка:

```json
{"success": false, "message": "Указанное время занято"}
```

Если включён числовой формат, `your_slot_id` выглядит так:

```json
{
  "your_slot_id": "202601101830"
}
```

## 3) Получение тарифов

**GET** `/mir-kvestov/{questSlug}/get_price?date=YYYY-MM-DD&time=HH:MM`

Пример:

```bash
curl "https://example.com/api/mir-kvestov/quest-slug/get_price?date=2026-01-10&time=18:30"
```

Ответ:

```json
{
  "Базовая цена: 3500 руб.": 3500
}
```

## 4) Предоплата (MirKvestov)

**GET** `/mir-kvestov/{questSlug}/prepay?md5=...&unique_id=...&prepay=...`

Пример:

```bash
curl "https://example.com/api/mir-kvestov/quest-slug/prepay?md5=abcdef&unique_id=mk-12345&prepay=1000"
```

Ответ:

```json
{"success":true}
```

## 5) Создание брони с сайта (внутренний API)

**POST** `/bookings`

```bash
curl -X POST "https://example.com/api/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "questId": "e2d56c7d-5a57-4a5f-b623-4c3c8ff7b944",
    "questScheduleId": "6f70681b-3b5a-4b2d-a570-2f399e1a0b44",
    "customerName": "Иван Иванов",
    "customerPhone": "+7 (900) 000-00-00",
    "customerEmail": "ivan@example.com",
    "bookingDate": "2026-01-10",
    "participantsCount": 4,
    "notes": "Комментарий с сайта",
    "aggregator": "site"
  }'
```

Ответ:

```json
{
  "id": "7f60b65e-25c9-4f1c-8c4e-1bfcb6c3a3c3",
  "questId": "e2d56c7d-5a57-4a5f-b623-4c3c8ff7b944",
  "questScheduleId": "6f70681b-3b5a-4b2d-a570-2f399e1a0b44",
  "customerName": "Иван Иванов",
  "customerPhone": "+7 (900) 000-00-00",
  "customerEmail": "ivan@example.com",
  "bookingDate": "2026-01-10",
  "bookingTime": "18:30",
  "participantsCount": 4,
  "totalPrice": 3500,
  "status": "pending",
  "aggregator": "site"
}
```
