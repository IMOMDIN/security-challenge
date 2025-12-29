const { verifyToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const token = req.cookies?.auth_token;
    
    if (!token) {
      return res.status(401).json({ authenticated: false });
    }
    
    const result = verifyToken(token);
    
    if (result.valid) {
      return res.status(200).json({
        authenticated: true,
        user: result.user
      });
    }
    
    return res.status(401).json({
      authenticated: false,
      error: result.error
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};