const bcrypt = require('bcryptjs');
const { serialize } = require('cookie');

// Хранилище попыток в памяти (для демо)
// В продакшене используйте Redis или базу данных
const failedAttempts = new Map();
const blockTime = 15 * 60 * 1000; // 15 минут в миллисекундах
const maxAttempts = 5;

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of failedAttempts.entries()) {
    if (now - data.lastAttempt > 10 * 60 * 1000) { // 10 минут
      failedAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = async (req, res) => {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      body = {};
    }
    
    const { username, password } = body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Неверные данные',
        message: 'Заполните все поля' 
      });
    }
    
    // Получаем IP пользователя
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    // Проверяем блокировку
    const userData = failedAttempts.get(ip);
    
    if (userData && userData.attempts >= maxAttempts) {
      const timeSinceLastAttempt = Date.now() - userData.lastAttempt;
      
      if (timeSinceLastAttempt < blockTime) {
        const minutesLeft = Math.ceil((blockTime - timeSinceLastAttempt) / 60000);
        return res.status(429).json({ 
          error: 'Аккаунт заблокирован',
          message: `Слишком много попыток. Попробуйте через ${minutesLeft} минут.`,
          blocked: true
        });
      } else {
        // Время блокировки истекло, сбрасываем попытки
        failedAttempts.delete(ip);
      }
    }
    
    // Проверяем логин и пароль
    const correctUsername = 'admin';
    const correctPasswordHash = '$2a$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ'; // password123
    
    let isValid = false;
    
    // Проверка через bcrypt
    if (username === correctUsername) {
      isValid = bcrypt.compareSync(password, correctPasswordHash);
    }
    
    if (isValid) {
      // Успешный вход - сбрасываем попытки
      failedAttempts.delete(ip);
      
      // Устанавливаем куку
      res.setHeader('Set-Cookie', serialize('auth_token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60, // 1 час
        sameSite: 'lax'
      }));
      
      return res.status(200).json({ 
        success: true,
        message: 'Вход выполнен успешно!',
        redirect: '/dashboard.html'
      });
    }
    
    // Неудачная попытка
    if (!failedAttempts.has(ip)) {
      failedAttempts.set(ip, {
        attempts: 1,
        lastAttempt: Date.now(),
        username: username
      });
    } else {
      const data = failedAttempts.get(ip);
      data.attempts++;
      data.lastAttempt = Date.now();
    }
    
    const attemptsLeft = maxAttempts - failedAttempts.get(ip).attempts;
    
    if (attemptsLeft <= 0) {
      return res.status(429).json({ 
        error: 'Аккаунт заблокирован',
        message: 'Слишком много попыток. Блокировка на 15 минут.',
        blocked: true
      });
    }
    
    return res.status(401).json({ 
      error: 'Неверные данные',
      message: `Неверный логин или пароль. Осталось попыток: ${attemptsLeft}`,
      attemptsLeft: attemptsLeft
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      message: 'Попробуйте позже'
    });
  }
};