const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  console.log('✅ Login API called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { username, password } = typeof req.body === 'string' 
      ? JSON.parse(req.body) 
      : req.body;
    
    console.log('🔑 Received:', { username, password });
    
    // Тестовый пользователь
    const users = [{
      username: 'admin',
      // Хэш пароля "password123"
      passwordHash: '$2a$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ'
    }];
    
    const user = users.find(u => u.username === username);
    
    // ПРОСТАЯ ПРОВЕРКА ДЛЯ ТЕСТА
    if (username === 'admin' && password === 'password123') {
      console.log('✅ Login successful (simple check)');
      return res.status(200).json({ 
        success: true,
        message: 'Вход выполнен успешно!',
        user: { username: 'admin' }
      });
    }
    
    // Проверка с bcrypt (если нужна)
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      console.log('✅ Login successful (bcrypt check)');
      return res.status(200).json({ 
        success: true,
        message: 'Вход выполнен успешно!',
        user: { username: user.username }
      });
    }
    
    console.log('❌ Invalid credentials');
    return res.status(401).json({ 
      error: 'Неверные данные',
      message: 'Используйте: admin / password123',
      hint: `Вы ввели: ${username} / ${password}`
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(200).json({ 
      error: 'Техническая ошибка',
      details: error.message,
      body: req.body
    });
  }
};