const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;

// Хранилище для блокировок (по сессии)
const failedAttempts = new Map();

// Предустановленный пользователь (логин: admin, пароль: password123)
const users = [{
  username: 'admin',
  passwordHash: '$2b$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ'
}];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key-' + Math.random().toString(36),
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 1000 * 60 * 60 // 1 час
  }
}));

// Очистка старых блокировок каждые 5 минут
setInterval(() => {
  const now = Date.now();
  const blockTime = 15 * 60 * 1000;
  
  for (const [sessionId, data] of failedAttempts.entries()) {
    if (now - data.lastAttempt > blockTime) {
      failedAttempts.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// Проверка блокировки по сессии
function isBlocked(sessionId) {
  const data = failedAttempts.get(sessionId);
  if (!data) return false;
  
  if (data.attempts >= 5) {
    const now = Date.now();
    const blockTime = 15 * 60 * 1000;
    
    if (now - data.lastAttempt < blockTime) {
      return true;
    } else {
      failedAttempts.delete(sessionId);
      return false;
    }
  }
  return false;
}

// HTML для главной страницы
const indexHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Авторизация</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        h2 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: opacity 0.3s;
        }
        button:hover {
            opacity: 0.9;
        }
        .error {
            color: #e74c3c;
            text-align: center;
            margin-top: 10px;
            padding: 10px;
            background: #fde8e8;
            border-radius: 5px;
            display: none;
        }
        .info {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
        .success {
            color: #2ecc71;
            text-align: center;
            margin-top: 10px;
            padding: 10px;
            background: #e8fde8;
            border-radius: 5px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>🔐 Авторизация</h2>
        <div class="error" id="error-message"></div>
        <div class="success" id="success-message"></div>
        <form id="login-form">
            <div class="form-group">
                <label for="username">Логин:</label>
                <input type="text" id="username" name="username" required 
                       placeholder="Введите логин">
            </div>
            <div class="form-group">
                <label for="password">Пароль:</label>
                <input type="password" id="password" name="password" required 
                       placeholder="Введите пароль">
            </div>
            <button type="submit">Войти</button>
        </form>
        <div class="info">
            Тестовые данные:<br>
            <strong>Логин: admin</strong><br>
            <strong>Пароль: password123</strong><br><br>
            После 5 неудачных попыток - блокировка на 15 минут.<br>
            <button onclick="fillTestData()" style="margin-top: 10px; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Заполнить тестовые данные
            </button>
        </div>
    </div>

    <script>
        // Автозаполнение тестовых данных
        function fillTestData() {
            document.getElementById('username').value = 'admin';
            document.getElementById('password').value = 'password123';
            document.getElementById('success-message').textContent = 'Тестовые данные заполнены!';
            document.getElementById('success-message').style.display = 'block';
        }
        
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('error-message');
            const successEl = document.getElementById('success-message');
            
            successEl.style.display = 'none';
            errorEl.style.display = 'none';
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include' // Важно для кук сессии
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    window.location.href = '/dashboard';
                } else {
                    errorEl.textContent = data.error || 'Ошибка авторизации';
                    errorEl.style.display = 'block';
                    
                    // Автоматически заполняем тестовые данные при ошибке
                    if (data.error && data.error.includes('Неверные данные')) {
                        setTimeout(fillTestData, 500);
                    }
                }
            } catch (error) {
                errorEl.textContent = 'Ошибка соединения с сервером';
                errorEl.style.display = 'block';
            }
        });
        
        // При загрузке страницы показываем сколько попыток осталось
        window.addEventListener('load', async () => {
            try {
                const response = await fetch('/api/attempts', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.attempts > 0) {
                        const attemptsLeft = 5 - data.attempts;
                        if (attemptsLeft > 0) {
                            document.getElementById('success-message').textContent = 
                                `У вас осталось ${attemptsLeft} попыток из 5`;
                            document.getElementById('success-message').style.display = 'block';
                        }
                    }
                }
            } catch (error) {
                // Игнорируем ошибку
            }
        });
    </script>
</body>
</html>
`;

// HTML для dashboard
const dashboardHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Панель управления</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
        }
        .dashboard {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .success-icon {
            font-size: 50px;
            color: #2ecc71;
            margin-bottom: 20px;
        }
        .message {
            color: #555;
            margin-bottom: 30px;
            font-size: 18px;
        }
        .logout-btn {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: opacity 0.3s;
        }
        .logout-btn:hover {
            opacity: 0.9;
        }
        .back-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 15px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="success-icon">✅</div>
        <h1>Добро пожаловать, admin!</h1>
        <div class="message">
            Вы успешно авторизовались в системе.<br>
            Это защищенная страница, доступная только после ввода правильных логина и пароля.
        </div>
        <button class="logout-btn" onclick="window.location.href='/logout'">
            Выйти из системы
        </button>
        <div style="margin-top: 20px;">
            <button class="back-btn" onclick="window.location.href='/'">
                ← На страницу входа
            </button>
        </div>
    </div>
</body>
</html>
`;

// Главная страница
app.get('/', (req, res) => {
  if (req.session.isAuth) {
    return res.redirect('/dashboard');
  }
  res.send(indexHTML);
});

// Страница dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.isAuth) {
    return res.redirect('/');
  }
  res.send(dashboardHTML);
});

// API для проверки попыток
app.get('/api/attempts', (req, res) => {
  const sessionId = req.sessionID;
  const data = failedAttempts.get(sessionId);
  res.json({ attempts: data ? data.attempts : 0 });
});

// API для логина
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sessionId = req.sessionID;
  
  // Проверка блокировки
  if (isBlocked(sessionId)) {
    const data = failedAttempts.get(sessionId);
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
    failedAttempts.delete(sessionId);
    return res.json({ success: true });
  }
  
  // Неудачная попытка
  if (!failedAttempts.has(sessionId)) {
    failedAttempts.set(sessionId, { attempts: 1, lastAttempt: Date.now() });
  } else {
    const data = failedAttempts.get(sessionId);
    data.attempts++;
    data.lastAttempt = Date.now();
  }
  
  const attemptsLeft = 5 - failedAttempts.get(sessionId).attempts;
  
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

// Сброс блокировки (для тестирования)
app.get('/reset', (req, res) => {
  const sessionId = req.sessionID;
  failedAttempts.delete(sessionId);
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`🔗 Ссылка: https://ваш-проект.onrender.com`);
  console.log(`🔑 Тестовые данные: admin / password123`);
});