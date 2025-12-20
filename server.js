const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path'); // Добавляем path
const app = express();
const PORT = process.env.PORT || 3000; // Render сам назначает порт

// Хранилище для блокировок
const failedAttempts = new Map();

// Предустановленный пользователь
const users = [{
  username: 'admin',
  // Хэш пароля "password123"
  passwordHash: '$2b$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ'
}];

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key-render',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000 // 1 час
  }
}));

// Проверка блокировки
function isBlocked(ip) {
  const data = failedAttempts.get(ip);
  if (!data) return false;
  
  if (data.attempts >= 5) {
    const now = Date.now();
    const blockTime = 15 * 60 * 1000;
    
    if (now - data.lastAttempt < blockTime) {
      return true;
    } else {
      failedAttempts.delete(ip);
      return false;
    }
  }
  return false;
}

// Главная страница
app.get('/', (req, res) => {
  if (req.session.isAuth) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Страница dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.isAuth) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API для логина
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  
  // Проверка блокировки
  if (isBlocked(ip)) {
    const data = failedAttempts.get(ip);
    const blockTime = 15 * 60 * 1000;
    const timeLeft = Math.ceil((blockTime - (Date.now() - data.lastAttempt)) / 1000 / 60);
    return res.status(429).json({ 
      error: `Аккаунт заблокирован. Попробуйте через ${timeLeft} минут` 
    });
  }
  
  // Поиск пользователя
  const user = users.find(u => u.username === username);
  
  if (user && bcrypt.compareSync(password, user.passwordHash)) {
    // Успешный вход
    req.session.isAuth = true;
    req.session.username = username;
    failedAttempts.delete(ip);
    return res.json({ success: true });
  }
  
  // Неудачная попытка
  if (!failedAttempts.has(ip)) {
    failedAttempts.set(ip, { attempts: 1, lastAttempt: Date.now() });
  } else {
    const data = failedAttempts.get(ip);
    data.attempts++;
    data.lastAttempt = Date.now();
  }
  
  const attemptsLeft = 5 - failedAttempts.get(ip).attempts;
  
  if (attemptsLeft <= 0) {
    res.status(429).json({ 
      error: 'Слишком много попыток. Аккаунт заблокирован на 15 минут.' 
    });
  } else {
    res.status(401).json({ 
      error: `Неверные данные. Осталось попыток: ${attemptsLeft}` 
    });
  }
});

// Выход
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Обработка 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Доступ по ссылке: https://ваш-проект.onrender.com`);
});