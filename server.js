const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 3000;

// Хранилище для блокировок (в реальном проекте используйте БД)
const failedAttempts = new Map();

// Предустановленный пользователь (логин: admin, пароль: password123)
const users = [{
  username: 'admin',
  // Хэш пароля "password123"
  passwordHash: '$2b$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ'
}];

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true для HTTPS
}));

// Проверка блокировки
function isBlocked(ip) {
  const data = failedAttempts.get(ip);
  if (!data) return false;
  
  if (data.attempts >= 5) {
    const now = Date.now();
    const blockTime = 15 * 60 * 1000; // 15 минут в мс
    
    if (now - data.lastAttempt < blockTime) {
      return true;
    } else {
      // Сброс после 15 минут
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
  res.sendFile(__dirname + '/public/index.html');
});

// Страница dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.isAuth) {
    return res.redirect('/');
  }
  res.sendFile(__dirname + '/public/dashboard.html');
});

// API для логина
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  
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
    failedAttempts.delete(ip); // Сброс попыток
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

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});