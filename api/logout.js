const { invalidateToken } = require('../../lib/auth');
const { serialize } = require('cookie');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const token = req.cookies?.auth_token;
    
    if (token) {
      invalidateToken(token);
    }
    
    // Удаляем куку
    res.setHeader('Set-Cookie', serialize('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    }));
    
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};