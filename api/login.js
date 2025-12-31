const bcrypt = require('bcryptjs');
const { serialize } = require('cookie');

// Простое хранилище в памяти
const failedAttempts = new Map();

module.exports = async (req, res) => {
  console.log('🔐 Login function called');
  
  // ВСЕГДА возвращаем JSON
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Получаем тело запроса
    let body = {};
    
    if (req.method === 'POST') {
      if (typeof req.body === 'string' && req.body) {
        try {
          body = JSON.parse(req.body);
        } catch (e) {
          console.error('JSON parse error:', e);
          return res.status(400).json({ 
            error: 'Invalid JSON',
            message: 'Неверный формат данных'
          });
        }
      } else if (typeof req.body === 'object') {
        body = req.body;
      }
    } else {
      return res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Только POST запросы'
      });
    }
    
    const { username, password } = body;
    
    // Проверяем обязательные поля
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Missing fields',
        message: 'Заполните логин и пароль'
      });
    }
    
    // Получаем IP для блокировки
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    
    // Проверяем блокировку (15 минут)
    const userAttempts = failedAttempts.get(ip);
    const BLOCK_TIME = 15 * 60 * 1000; // 15 минут
    const MAX_ATTEMPTS = 5;
    
    if (userAttempts) {
      const timeSinceLast = Date.now() - userAttempts.lastAttempt;
      
      if (userAttempts.count >= MAX_ATTEMPTS && timeSinceLast < BLOCK_TIME) {
        const minutesLeft = Math.ceil((BLOCK_TIME - timeSinceLast) / 60000);
        return res.status(429).json({
          error: 'Account blocked',
          message: `Аккаунт заблокирован. Попробуйте через ${minutesLeft} минут`,
          blocked: true
        });
      }
      
      // Сбрасываем если прошло больше 15 минут
      if (timeSinceLast > BLOCK_TIME) {
        failedAttempts.delete(ip);
      }
    }
    
    // Проверяем логин и пароль
    const isCorrect = username === 'admin' && 
                     bcrypt.compareSync(password, '$2a$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ');
    
    if (isCorrect) {
      // Успешный вход - сбрасываем счетчик
      failedAttempts.delete(ip);
      
      console.log('✅ Login successful for user:', username);
      
      // Устанавливаем куку
      res.setHeader('Set-Cookie', serialize('auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 3600, // 1 час
        sameSite: 'lax'
      }));
      
      return res.status(200).json({
        success: true,
        message: 'Вход выполнен успешно!',
        redirect: '/dashboard.html'
      });
    }
    
    // Неправильные данные - увеличиваем счетчик
    if (!failedAttempts.has(ip)) {
      failedAttempts.set(ip, {
        count: 1,
        lastAttempt: Date.now()
      });
    } else {
      const attempts = failedAttempts.get(ip);
      attempts.count++;
      attempts.lastAttempt = Date.now();
    }
    
    const attemptsData = failedAttempts.get(ip);
    const attemptsLeft = MAX_ATTEMPTS - attemptsData.count;
    
    if (attemptsLeft <= 0) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: 'Слишком много попыток. Блокировка на 15 минут.',
        blocked: true
      });
    }
    
    return res.status(401).json({
      error: 'Invalid credentials',
      message: `Неверный логин или пароль. Осталось попыток: ${attemptsLeft}`,
      attemptsLeft: attemptsLeft
    });
    
  } catch (error) {
    console.error('❌ Login function error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Внутренняя ошибка сервера',
      details: error.message
    });
  }
};