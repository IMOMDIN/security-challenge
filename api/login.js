const bcrypt = require('bcryptjs');
const { serialize } = require('cookie');

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
      passwordHash: '$2a$10$K7VqB5h2W5ZQhZQhV8n8XeB0nV8mR5pZQhZQhV8n8XeB0nV8mR5pZQ'
    }];
    
    const user = users.find(u => u.username === username);
    
    // ПРОСТАЯ ПРОВЕРКА
    if (username === 'admin' && password === 'password123') {
      console.log('✅ Login successful');
      
      // Устанавливаем простую куку для сессии
      res.setHeader('Set-Cookie', serialize('auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 // 1 час
      }));
      
      return res.status(200).json({ 
        success: true,
        message: 'Вход выполнен успешно!',
        redirect: '/dashboard.html'  // Перенаправляем на dashboard.html
      });
    }
    
    // Проверка с bcrypt
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      console.log('✅ Login successful (bcrypt)');
      
      res.setHeader('Set-Cookie', serialize('auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60
      }));
      
      return res.status(200).json({ 
        success: true,
        message: 'Вход выполнен успешно!',
        redirect: '/dashboard.html'
      });
    }
    
    console.log('❌ Invalid credentials');
    return res.status(401).json({ 
      error: 'Неверные данные',
      message: 'Используйте: admin / password123'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      error: 'Техническая ошибка',
      details: error.message
    });
  }
};