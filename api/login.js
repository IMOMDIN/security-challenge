const bcrypt = require('bcryptjs');

// Простое хранилище
const attempts = {};

module.exports = async (req, res) => {
  console.log('=== LOGIN CALLED ===');
  
  try {
    // Получаем данные
    let data = {};
    
    if (req.method === 'POST') {
      if (typeof req.body === 'string') {
        try {
          data = JSON.parse(req.body);
        } catch {
          data = {};
        }
      } else {
        data = req.body || {};
      }
    }
    
    const { username, password } = data;
    console.log('Received:', { username, password });
    
    // Блокировка
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const BLOCK_MS = 15 * 60 * 1000;
    
    if (attempts[ip] && attempts[ip].count >= 5) {
      const timePassed = now - attempts[ip].lastTry;
      if (timePassed < BLOCK_MS) {
        const minutesLeft = Math.ceil((BLOCK_MS - timePassed) / 60000);
        return res.json({
          success: false,
          error: `Заблокировано на ${minutesLeft} минут`
        });
      } else {
        delete attempts[ip]; // Разблокируем
      }
    }
    
    // Проверяем пароль
    const correctHash = '$2a$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ';
    const isCorrect = username === 'admin' && bcrypt.compareSync(password, correctHash);
    
    if (isCorrect) {
      console.log('✅ CORRECT PASSWORD');
      delete attempts[ip]; // Сбрасываем счетчик
      
      return res.json({
        success: true,
        message: 'Успешный вход!',
        redirect: true, // ДОБАВИЛИ ЭТО
        redirectUrl: '/dashboard.html' // И ЭТО
      });
    }
    
    // Неправильный пароль
    if (!attempts[ip]) {
      attempts[ip] = { count: 1, lastTry: now };
    } else {
      attempts[ip].count++;
      attempts[ip].lastTry = now;
    }
    
    const left = 5 - attempts[ip].count;
    
    return res.json({
      success: false,
      error: left > 0 ? `Неверно. Осталось попыток: ${left}` : 'Заблокировано на 15 минут'
    });
    
  } catch (err) {
    console.error('ERROR:', err);
    return res.json({
      success: false,
      error: 'Ошибка сервера'
    });
  }
};