# Telegram Mini App — Рулетка призов

Готовый минимальный проект Telegram Mini App (Web App) с колесом удачи:
- Фронтенд: чистый HTML/Canvas/JS (без сборщиков)
- Бэкенд: Node.js + Express
- Проверка `initData` по токену бота (защита от накруток)
- Лимит попыток в сутки
- Весовая вероятность выпадения призов
- Красивый интерфейс и анимация

## Быстрый старт (локально)

1. Установите зависимости:
```bash
npm i
```
2. Скопируйте `.env.example` в `.env` и пропишите токен бота:
```env
BOT_TOKEN=ВАШ_ТОКЕН_БОТА
PUBLIC_URL=http://localhost:8080
ALLOW_DEV=true
SPINS_PER_DAY=1
```
> На локалке можно оставить `ALLOW_DEV=true`. Если `BOT_TOKEN` пуст, сервер пропустит dev-пользователя.

3. Запустите сервер:
```bash
npm start
```
Фронтенд и API будут доступны на `http://localhost:8080`

## Подключение к Telegram
1. Создайте бота в @BotFather.
2. Включите **Web App**:
   - `/setdomain` → ваш домен с HTTPS, на котором будет хоститься приложение (например, Vercel, Render, Cloudflare Pages + Workers).
   - (Опционально) `/setmenubutton` → добавьте кнопку с Web App (URL вашего фронтенда).
3. В самом фронте мы автоматически берём `initData` из `Telegram.WebApp.initData` и отправляем на бэкенд для валидации.
4. На бою обязательно укажите `BOT_TOKEN` и поставьте `ALLOW_DEV=false`.

## Конфигурация призов
Призы заданы в `server.js` массивом:
```js
let prizes = [
  { label: '1 день VIP', weight: 10, color: '#F59E0B', id: 'vip1' },
  { label: 'Ничего',  weight: 30, color: '#9CA3AF', id: 'nothing' },
  { label: 'Скидка 50%', weight: 15, color: '#10B981', id: 'disc50' },
  { label: '100 ₽', weight: 10, color: '#3B82F6', id: 'r100' },
  { label: 'Стикер-пак', weight: 15, color: '#EC4899', id: 'stickers' },
  { label: 'Месяц PRO', weight: 5,  color: '#8B5CF6', id: 'pro30' },
  { label: '5% скидка', weight: 15, color: '#EF4444', id: 'disc5' }
]
```
- `weight` — чем больше, тем чаще выпадает.
- Можно добавить поля `stock` и уменьшать остатки.

## API
- `GET /api/prizes` — список призов для отрисовки колеса.
- `POST /api/spin` — совершить прокрутку.
  - body: `{ initData: string }`
  - ответ: `{ ok: true, index, prize }`
  - сервер сам выбирает приз по весам, чтобы фронт не мог подменить результат.

## Безопасность
- Валидация `initData` реализована по документации Telegram (HMAC-SHA256 с секретом `sha256(bot_token)`).
- На локалке можно тестировать без `BOT_TOKEN`, если `ALLOW_DEV=true`.

## Деплой
- Любой Node-хостинг (Render, Railway, Fly.io, Heroku-like).
- Важно: фронтенд должен быть по HTTPS (иначе не откроется в Telegram).
- Укажите домен в @BotFather (`/setdomain`).

## Кастомизация
- Внешний вид: `public/style.css`
- Логика и анимация: `public/app.js`
- Серверная логика, лимиты, валидация: `server.js`

Удачи! 🎡
