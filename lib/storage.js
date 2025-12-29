// Временное хранилище в памяти
// В реальном проекте используйте Redis, MongoDB или Vercel KV

const storage = {
  failedAttempts: new Map(),
  tokens: new Map()
};

// Очистка старых данных каждые 5 минут
setInterval(() => {
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;
  
  // Очистка старых блокировок
  for (const [key, data] of storage.failedAttempts.entries()) {
    if (now - data.lastAttempt > fifteenMinutes) {
      storage.failedAttempts.delete(key);
    }
  }
  
  // Очистка старых токенов
  for (const [token, data] of storage.tokens.entries()) {
    if (now - data.created > 24 * 60 * 60 * 1000) {
      storage.tokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

module.exports = storage;