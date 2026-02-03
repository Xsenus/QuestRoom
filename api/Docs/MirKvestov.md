# Интеграция mir-kvestov.ru

Документ описывает интеграцию агрегатора mir-kvestov.ru с API QuestRoom. Все эндпоинты находятся по пути `/api/mir-kvestov`.

## 1) Получение расписания

**URL**

```
GET /api/mir-kvestov/{questSlug}
GET /api/mir-kvestov/{questSlug}.json
```

**Query параметры (опционально)**

- `from` — дата начала в формате `YYYY-MM-DD`.
- `to` — дата окончания в формате `YYYY-MM-DD`.

Если параметры не переданы, API возвращает расписание на количество дней из настроек интеграции (по умолчанию — 14), включая текущий локальный день, с учётом тайм‑зоны.

**Ответ**

Массив слотов:

```json
[
  {
    "date": "2016-05-05",
    "time": "18:30",
    "is_free": true,
    "price": 3000,
    "discount_price": 2800,
    "your_slot_id": "e2d56c7d-5a57-4a5f-b623-4c3c8ff7b944"
  }
]
```

Поле `discount_price` возвращается только если будет добавлена логика скидок (по умолчанию `null`).
Поле `your_slot_id` может возвращаться в виде GUID или числового кода `YYYYMMDDHHMM` (по умолчанию используется числовой формат, настраивается в настройках интеграции).
Список полей, которые отдаются в расписании, можно настраивать в админке на вкладке «API».

## 2) Бронирование слота

**URL**

```
POST /api/mir-kvestov/{questSlug}/order
POST /api/mir-kvestov/{questSlug}.json/order
```

**Формат запроса**

Поддерживается `application/x-www-form-urlencoded` и JSON.

**Параметры**

- `first_name` — имя клиента.
- `family_name` — фамилия клиента.
- `phone` — телефон.
- `email` — email.
- `comment` — комментарий (опционально).
- `source` — источник бронирования (по умолчанию `mir-kvestov.ru`).
- `md5` — md5 от строки `ИмяФамилияТелефонEmailMd5key`. Если ключ не задан в конфиге, проверка пропускается.
- `date` — дата игры в формате `YYYY-MM-DD`.
- `time` — время игры в формате `HH:MM`.
- `price` — цена, переданная агрегатором.
- `unique_id` — уникальный ID брони в системе mir-kvestov.
- `your_slot_id` — ID слота, который был возвращён в расписании. Поддерживается GUID или числовой формат `YYYYMMDDHHMM`.
- `players` — ожидаемое количество участников.
- `tariff` — выбранный тариф.

**Ответы**

Успех:

```json
{"success": true}
```

Ошибка (общее сообщение):

```json
{"success": false, "message": "error message"}
```

Если слот занят (строгое сообщение):

```json
{"success": false, "message": "Указанное время занято"}
```

При бронировании сначала используется `your_slot_id`, если он передан (GUID или `YYYYMMDDHHMM`), и только затем дата/время из запроса.

## 3) Получение тарифов

**URL**

```
GET /api/mir-kvestov/{questSlug}/get_price?date=YYYY-MM-DD&time=HH:MM
GET /api/mir-kvestov/{questSlug}.json/get_price?date=YYYY-MM-DD&time=HH:MM
```

**Ответ**

```json
{
  "Базовая цена: 3500 руб.": 3500
}
```

## 4) Предоплата

**URL**

```
GET /api/mir-kvestov/{questSlug}/prepay?md5=...&unique_id=...&prepay=...
GET /api/mir-kvestov/{questSlug}.json/prepay?md5=...&unique_id=...&prepay=...
```

`md5` вычисляется из строки `[prepay_md5][unique_id][prepay]`.

**Ответ**

Строгое значение (без пробелов):

```
{"success":true}
```

## 5) Настройки

Настройки интеграции задаются в админке на вкладке «API» (таблица `settings`):

- `Md5Key` — секретный ключ для проверки md5 (если пустой — проверка отключается). Можно указать несколько ключей через запятую или точку с запятой.
- `PrepayMd5Key` — секретный ключ для проверки предоплаты. Можно указать несколько ключей через запятую или точку с запятой.
- `SlotIdFormat` — формат `your_slot_id`: `numeric` (по умолчанию) или `guid`.
- `ScheduleDaysAhead` — количество дней, которое возвращается по умолчанию (если `from/to` не переданы).
- `ScheduleFields` — список полей, которые возвращаются в расписании.

Параметр `TimeZone` используется из настроек сайта (`settings.time_zone`) для вычисления локальной даты.
