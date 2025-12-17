const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация базы данных
let db;
try {
  db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
  console.log('✅ База данных загружена');
} catch (error) {
  console.log('⚠️ Создание новой базы данных...');
  db = {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "password": "SecurePass123!",
        "role": "admin",
        "secret": "Флаг: FLAG{you_hacked_the_admin}"
      },
      {
        "id": 2,
        "username": "user",
        "password": "User2024",
        "role": "user",
        "secret": "Обычный пользователь, секретов нет"
      }
    ],
    "sessions": [],
    "loginAttempts": {}
  };
}

// Middleware для защиты
app.use(helmet()); // Защита HTTP заголовков
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Защита от брутфорса - максимум 5 попыток за 15 минут
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' }
});

// Отдача главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API для входа
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  // Валидация входных данных
  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  // Защита от SQL-инъекций (санитизация)
  const cleanUsername = username.replace(/[<>\"']/g, '');
  const cleanPassword = password.replace(/[<>\"']/g, '');

  // Проверка длины (защита от переполнения)
  if (cleanUsername.length > 50 || cleanPassword.length > 50) {
    return res.status(400).json({ error: 'Логин или пароль слишком длинный' });
  }

  // Поиск пользователя
  const user = db.users.find(u => u.username === cleanUsername);

  if (!user) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  // Проверка пароля
  if (user.password !== cleanPassword) {
    // Логирование попытки взлома
    const ip = req.ip || 'unknown';
    if (!db.loginAttempts[ip]) {
      db.loginAttempts[ip] = [];
    }
    db.loginAttempts[ip].push({
      username: cleanUsername,
      time: new Date().toISOString()
    });
    
    // Сохранение в базу (если возможно)
    try {
      fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
    } catch (e) {
      console.log('⚠️ Не удалось сохранить попытку входа');
    }

    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  // Успешный вход - создание сессии
  const sessionToken = generateToken();
  db.sessions.push({
    token: sessionToken,
    userId: user.id,
    createdAt: new Date().toISOString()
  });
  
  // Сохранение в базу (если возможно)
  try {
    fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
  } catch (e) {
    console.log('⚠️ Не удалось сохранить сессию');
  }

  res.json({
    success: true,
    token: sessionToken,
    user: {
      username: user.username,
      role: user.role,
      secret: user.secret
    }
  });
});

// API для проверки статуса (для отладки)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    users: db.users.length,
    sessions: db.sessions.length,
    timestamp: new Date().toISOString()
  });
});

// Генерация случайного токена
function generateToken() {
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
}

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔒 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Сервер готов принимать запросы`);
});