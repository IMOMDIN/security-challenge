const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const storage = require('./storage');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const BLOCK_TIME = 15 * 60 * 1000; // 15 минут
const MAX_ATTEMPTS = 5;

// Предустановленный пользователь
const users = [
  {
    id: 1,
    username: 'admin',
    // Хэш пароля "password123"
    passwordHash: '$2a$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ'
  }
];

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

// Проверка логина и пароля
function authenticate(username, password, identifier) {
  // Проверка блокировки
  if (isBlocked(identifier)) {
    const data = storage.failedAttempts.get(identifier);
    const timeLeft = BLOCK_TIME - (Date.now() - data.lastAttempt);
    return {
      success: false,
      error: 'blocked',
      minutesLeft: Math.ceil(timeLeft / 60000)
    };
  }
  
  // Поиск пользователя
  const user = users.find(u => u.username === username);
  
  if (user && bcrypt.compareSync(password, user.passwordHash)) {
    // Успешный вход
    storage.failedAttempts.delete(identifier);
    
    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Сохраняем токен
    storage.tokens.set(token, {
      userId: user.id,
      username: user.username,
      created: Date.now()
    });
    
    return {
      success: true,
      token,
      user: { id: user.id, username: user.username }
    };
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
  
  return {
    success: false,
    error: attemptsLeft <= 0 ? 'blocked' : 'invalid',
    attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0
  };
}

// Проверка JWT токена
function verifyToken(token) {
  try {
    // Проверяем в хранилище
    if (!storage.tokens.has(token)) {
      return { valid: false, error: 'Token not found' };
    }
    
    // Проверяем JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    const stored = storage.tokens.get(token);
    
    if (!stored || stored.userId !== decoded.userId) {
      return { valid: false, error: 'Token mismatch' };
    }
    
    return { valid: true, user: stored };
  } catch (error) {
    // Удаляем невалидный токен
    storage.tokens.delete(token);
    return { valid: false, error: error.message };
  }
}

// Удаление токена
function invalidateToken(token) {
  storage.tokens.delete(token);
  return true;
}

// Получение информации о попытках
function getAttemptsInfo(identifier) {
  const data = storage.failedAttempts.get(identifier);
  if (!data) {
    return { attempts: 0, attemptsLeft: MAX_ATTEMPTS };
  }
  
  const attemptsLeft = MAX_ATTEMPTS - data.attempts;
  const isBlockedNow = isBlocked(identifier);
  
  if (isBlockedNow) {
    const timeLeft = BLOCK_TIME - (Date.now() - data.lastAttempt);
    return {
      attempts: data.attempts,
      attemptsLeft: 0,
      blocked: true,
      minutesLeft: Math.ceil(timeLeft / 60000)
    };
  }
  
  return {
    attempts: data.attempts,
    attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0,
    blocked: false
  };
}

module.exports = {
  authenticate,
  verifyToken,
  invalidateToken,
  getAttemptsInfo,
  isBlocked
};