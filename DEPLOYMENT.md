# Развёртывание Bùshǒu

Инструкции для различных способов запуска приложения.

## 1️⃣ Локальный запуск (развитие)

### Предварительно
- Git установлен
- Python 3+ или Node.js установлены

### Шаги

```bash
# Клонируй репо
git clone https://github.com/yourusername/bushou.git
cd bushou

# Вариант А: Python (встроён в macOS/Linux)
python -m http.server 8000

# Вариант Б: Node.js (если установлен)
npx http-server

# Вариант В: npm скрипт
npm install
npm start
```

Откройся в браузере: **http://localhost:8000**

---

## 2️⃣ GitHub Pages (бесплатный хостинг)

### Предварительно
- GitHub аккаунт
- Репо на GitHub

### Шаги

1. **Перейди в Settings → Pages**
   ```
   GitHub репо → Settings → Pages
   ```

2. **Выбери Source**
   ```
   Branch: main (или master)
   Folder: / (root)
   ```

3. **Сохрани и жди ~1-2 минуты**

4. **Приложение будет доступно по адресу:**
   ```
   https://yourusername.github.io/bushou
   ```

### Проверка статуса
- Actions → Deploy to GitHub Pages
- Должен быть ✅ (зелёная галочка)

---

## 3️⃣ Netlify (продвинутый вариант)

### Предварительно
- Netlify аккаунт (бесплатно)
- Репо на GitHub

### Шаги

1. **Перейди на [netlify.com](https://netlify.com)**
2. **Нажми "New site from Git"**
3. **Выбери GitHub и авторизуйся**
4. **Выбери репо `bushou`**
5. **Настройки:**
   ```
   Branch to deploy: main
   Build command: (оставить пусто)
   Publish directory: . (current directory)
   ```
6. **Deploy**

### Результат
```
https://bushou-yourname.netlify.app
```

---

## 4️⃣ Vercel (самый простой)

### Шаги

1. **Перейди на [vercel.com](https://vercel.com)**
2. **Нажми "Import Project"**
3. **Выбери "From Git Repository"**
4. **Авторизуйся на GitHub**
5. **Выбери репо `bushou`**
6. **Нажми "Deploy"**

### Результат
```
https://bushou-yourname.vercel.app
```

---

## 5️⃣ Docker (контейнеризация)

### Dockerfile

Создай файл `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY . .

EXPOSE 8000

CMD ["python", "-m", "http.server", "8000"]
```

### Запуск

```bash
# Собери образ
docker build -t bushou .

# Запусти контейнер
docker run -p 8000:8000 bushou

# Приложение доступно на http://localhost:8000
```

---

## 6️⃣ Docker Compose (если нужны доп. сервисы)

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - PYTHONUNBUFFERED=1
```

Запуск:
```bash
docker-compose up
```

---

## 🔧 Тестирование перед развёртыванием

### Чеклист
- [ ] Приложение запускается локально без ошибок
- [ ] JSON загружается корректно
- [ ] Обе темы работают (светлая и тёмная)
- [ ] Все экраны доступны (Home, Card, Train)
- [ ] Hanzi Writer анимирует иероглифы
- [ ] Режим обводки работает
- [ ] Flexcard переворачивается
- [ ] Печати-штампы визуализируются

### Кроссбраузерное тестирование
```
Chrome:   ✅
Firefox:  ✅
Safari:   ✅
Edge:     ✅
Mobile:   ✅ (DevTools → Toggle device toolbar)
```

---

## 📊 Мониторинг

### GitHub Pages Status
- https://yourusername.github.io/bushou/
- Проверь в DevTools (F12) → Console на ошибки

### Logs
- GitHub Actions: Repo → Actions → Deploy to GitHub Pages
- Netlify: Site analytics → Deploys
- Vercel: Dashboard → Deployments

---

## 🆘 Частые проблемы

### ❌ JSON не загружается
**Причина:** CORS или неверный путь
**Решение:**
```javascript
// Убедись, что fetch использует правильный путь
fetch('radicals_data.json')
```

### ❌ GitHub Pages показывает 404
**Причина:** Неверная ветка или папка
**Решение:**
```
Settings → Pages → выбери правильную ветку и папку
```

### ❌ На GitHub Pages не работает JavaScript
**Причина:** Часто это кэширование браузера
**Решение:**
```
Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

### ❌ Hanzi Writer не загружается
**Причина:** CDN не доступен или блокируется
**Решение:** Проверь консоль браузера (F12 → Console)

---

## 🚀 Автоматизация развёртывания

### GitHub Actions (встроено)

Добавлены два workflow:
1. **validate.yml** — проверяет JSON валидность
2. **deploy.yml** — автоматически деплоит на GitHub Pages при push

Они запускаются автоматически при `git push`.

---

## 📝 Environment переменные

Если добавишь backend, создай `.env`:

```env
API_URL=https://api.example.com
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**Важно:** НЕ коммитьте `.env` в git!

```bash
# .gitignore
.env
.env.local
```

---

## ✅ Чек-лист деплоя

- [ ] Репо создан на GitHub
- [ ] Все файлы закоммичены и запушены
- [ ] GitHub Actions выполняются успешно
- [ ] GitHub Pages/Netlify/Vercel настроены
- [ ] Приложение доступно по публичному URL
- [ ] Все функции работают на хостинге
- [ ] Кросс-браузерное тестирование пройдено

---

**Готово! 🎉 Приложение live!**

Если что-то не работает, открой [Issue](https://github.com/yourusername/bushou/issues).
