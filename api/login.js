const { authenticate } = require('../../lib/auth');
const { serialize } = require('cookie');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { username, password } = JSON.parse(req.body || '{}');
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Используем IP + User-Agent как идентификатор
    const identifier = [
      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      req.headers['user-agent']
    ].join('|');
    
    const result = authenticate(username, password, identifier);
    
    if (result.success) {
      // Устанавливаем куку с токеном
      res.setHeader('Set-Cookie', serialize('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 // 1 час
      }));
      
      return res.status(200).json({
        success: true,
        user: result.user
      });
    }
    
    // Обработка ошибок
    if (result.error === 'blocked') {
      return res.status(429).json({
        error: 'Аккаунт заблокирован',
        message: result.minutesLeft 
          ? `Попробуйте через ${result.minutesLeft} минут`
          : 'Слишком много попыток. Блокировка на 15 минут.'
      });
    }
    
    return res.status(401).json({
      error: 'Неверные данные',
      attemptsLeft: result.attemptsLeft,
      message: `Осталось попыток: ${result.attemptsLeft}`
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};