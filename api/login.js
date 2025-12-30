const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { serialize } = require('cookie');

// Временное хранилище
let storage = {
  failedAttempts: new Map(),
  tokens: new Map()
};

// Предустановленный пользователь
const users = [{
  username: 'admin',
  passwordHash: '$2a$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ'
}];

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-change-in-production';
const BLOCK_TIME = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Проверка блокировки
function isBlocked(identifier) {
  const data = storage.failedAttempts.get(identifier);
  if (!data) return false;
  
  if (data.attempts >= MAX_ATTEMPTS) {
    const now = Date.now();
    if (now - data.lastAttempt < BLOCK_TIME) {
      return true;
    } else {
      storage.failedAttempts.delete(identifier);
      return false;
    }
  }
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { username, password } = body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Идентификатор для блокировки
    const identifier = [
      req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
      req.headers['user-agent'] || 'unknown'
    ].join('|');
    
    // Проверка блокировки
    if (isBlocked(identifier)) {
      const data = storage.failedAttempts.get(identifier);
      const timeLeft = BLOCK_TIME - (Date.now() - data.lastAttempt);
      return res.status(429).json({ 
        error: `Аккаунт заблокирован. Попробуйте через ${Math.ceil(timeLeft / 60000)} минут`
      });
    }
    
    // Поиск пользователя
    const user = users.find(u => u.username === username);
    
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      // Успешный вход
      storage.failedAttempts.delete(identifier);
      
      // Создаем JWT токен
      const token = jwt.sign(
        { userId: 1, username: user.username },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Сохраняем токен
      storage.tokens.set(token, {
        userId: 1,
        username: user.username,
        created: Date.now()
      });
      
      // Устанавливаем куку
      res.setHeader('Set-Cookie', serialize('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 // 1 час
      }));
      
      return res.status(200).json({
        success: true,
        user: { username: user.username }
      });
    }
    
    // Неудачная попытка
    if (!storage.failedAttempts.has(identifier)) {
      storage.failedAttempts.set(identifier, {
        attempts: 1,
        lastAttempt: Date.now()
      });
    } else {
      const data = storage.failedAttempts.get(identifier);
      data.attempts++;
      data.lastAttempt = Date.now();
    }
    
    const attemptsLeft = MAX_ATTEMPTS - storage.failedAttempts.get(identifier).attempts;
    
    if (attemptsLeft <= 0) {
      return res.status(429).json({ 
        error: 'Слишком много попыток. Аккаунт заблокирован на 15 минут.'
      });
    }
    
    return res.status(401).json({ 
      error: 'Неверные данные',
      attemptsLeft: attemptsLeft,
      message: `Осталось попыток: ${attemptsLeft}`
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};