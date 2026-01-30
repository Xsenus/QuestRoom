# Автодеплой на VPS (Ubuntu 22+)

Документ описывает полностью автоматическую сборку и деплой фронта/бэка при пуше в ветку `main`.

## 1. Что делает автодеплой

После каждого пуша в `main` GitHub Actions по SSH подключается к VPS и выполняет:

- `git reset --hard origin/main` в репозитории на сервере;
- сборку фронтенда (`npm ci && npm run build`) и выкладку в `/var/www/questroom/frontend`;
- публикацию API (`dotnet publish`) в `/var/www/questroom/api`;
- рестарт systemd‑сервиса `questroom-api`.

## 2. Подготовка VPS

### 2.1 Обновить систему и поставить зависимости

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx rsync curl
```

#### Установить Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Установить .NET 9 runtime

```bash
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-runtime-9.0
```

#### Установить PostgreSQL (если ещё нет)

```bash
sudo apt install -y postgresql
```

Создайте БД и пользователя (пример):

```bash
sudo -u postgres psql
CREATE DATABASE questroom;
CREATE USER questroom_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE questroom TO questroom_user;
\q
```

### 2.2 Создать пользователя и папки

```bash
sudo useradd -m -s /bin/bash deployer
sudo mkdir -p /var/www/questroom
sudo chown -R deployer:deployer /var/www/questroom
```

Разрешите пользователю запускать нужные команды без пароля (для автоматического деплоя):

```bash
echo \"deployer ALL=(ALL) NOPASSWD: /usr/bin/systemctl, /usr/bin/rsync, /bin/mkdir, /bin/chown\" | sudo tee /etc/sudoers.d/questroom-deployer
sudo chmod 440 /etc/sudoers.d/questroom-deployer
```

### 2.3 Клонировать репозиторий на сервер

```bash
sudo -u deployer git clone <YOUR_GITHUB_REPO_URL> /var/www/questroom/repo
```

### 2.4 Настроить фронтенд переменные окружения

Скопируйте `.env.production.example` и обновите значения (например, API URL вашего домена):

```bash
sudo -u deployer cp /var/www/questroom/repo/.env.production.example /var/www/questroom/repo/.env.production
sudo -u deployer nano /var/www/questroom/repo/.env.production
```

Пример:

```env
VITE_API_URL=https://example.com/api
VITE_API_PROXY_TARGET=http://127.0.0.1:5000
```

### 2.5 Настроить переменные окружения API

Создайте файл `/etc/questroom/api.env`:

```bash
sudo mkdir -p /etc/questroom
sudo nano /etc/questroom/api.env
```

Пример содержимого:

```bash
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5000
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=questroom;Username=questroom_user;Password=strong_password
AdminUser__Email=admin@questroom.local
AdminUser__Password=strong_password_here
Jwt__Key=replace_with_very_long_secret_key_min_32_chars
Cors__AllowedOrigins__0=https://example.com
MirKvestov__Md5Key=replace_me
MirKvestov__PrepayMd5Key=replace_me
MirKvestov__TimeZone=Europe/Moscow
```

> Используется формат `Section__Key`, чтобы переопределять `appsettings.json`.

### 2.6 Systemd сервис для API

Скопируйте шаблон сервиса из репозитория:

```bash
sudo mkdir -p /var/www/questroom/api
sudo cp /var/www/questroom/repo/deploy/questroom-api.service /etc/systemd/system/questroom-api.service
```

Обновите владельца директорий (API будет публиковаться в `/var/www/questroom/api`):

```bash
sudo chown -R www-data:www-data /var/www/questroom/api
```

Запустите сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable questroom-api
sudo systemctl start questroom-api
sudo systemctl status questroom-api --no-pager
```

### 2.7 Настройка Nginx

Скопируйте конфиг:

```bash
sudo cp /var/www/questroom/repo/deploy/nginx.questroom.conf /etc/nginx/sites-available/questroom
```

Откройте файл и замените `example.com` на ваш домен:

```bash
sudo nano /etc/nginx/sites-available/questroom
```

Активируйте сайт и перезапустите Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/questroom /etc/nginx/sites-enabled/questroom
sudo nginx -t
sudo systemctl restart nginx
```

### 2.8 SSL сертификат (рекомендуется)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

## 3. GitHub Actions (автодеплой)

В репозиторий добавлен workflow `.github/workflows/deploy.yml`. Он использует SSH‑подключение.

### 3.1 Создать ключ и добавить в VPS

На локальной машине:

```bash
ssh-keygen -t ed25519 -C "questroom-deploy" -f ~/.ssh/questroom_deploy
```

Добавьте публичный ключ на сервер:

```bash
cat ~/.ssh/questroom_deploy.pub | ssh deployer@<VPS_HOST> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3.2 Добавить секреты в GitHub

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`:

- `VPS_HOST` — IP или домен VPS
- `VPS_USER` — пользователь (например, `deployer`)
- `VPS_SSH_KEY` — приватный ключ `~/.ssh/questroom_deploy`
- `VPS_PORT` — SSH‑порт (обычно `22`)
- `VPS_APP_DIR` — путь к репозиторию на сервере (по умолчанию `/var/www/questroom/repo`)
- `VPS_APP_ROOT` — путь к корню деплоя (по умолчанию `/var/www/questroom`)
- `VPS_SERVICE_NAME` — имя systemd сервиса (по умолчанию `questroom-api`)

После добавления секретов пуш в `main` будет автоматически запускать деплой.

## 4. Домены и DNS

1. В панели вашего регистратора создайте A‑запись:
   - `example.com` → `VPS_PUBLIC_IP`
   - `www.example.com` → `VPS_PUBLIC_IP`
2. Подождите обновления DNS (обычно до 24 часов).
3. Выпустите SSL через `certbot` (см. шаг 2.8).

## 5. Быстрая проверка

После деплоя:

- Фронтенд: `https://example.com`
- API: `https://example.com/api/quests`
- Swagger: `https://example.com/swagger`

## 6. Ручной запуск деплоя (на сервере)

Если нужно запустить деплой вручную:

```bash
bash /var/www/questroom/repo/scripts/deploy.sh
```

Скрипт принимает параметры:

```bash
bash scripts/deploy.sh <repo_path> <app_root> <service_name>
```

Пример:

```bash
bash scripts/deploy.sh /var/www/questroom/repo /var/www/questroom questroom-api
```
