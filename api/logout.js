const { serialize } = require('cookie');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Удаляем куку
  res.setHeader('Set-Cookie', serialize('auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0 // Удаляем куку
  }));
  
  // Перенаправляем на главную
  res.writeHead(302, { Location: '/' });
  res.end();
};