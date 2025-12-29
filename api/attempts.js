const { getAttemptsInfo } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const identifier = [
      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      req.headers['user-agent']
    ].join('|');
    
    const info = getAttemptsInfo(identifier);
    
    return res.status(200).json(info);
    
  } catch (error) {
    console.error('Attempts info error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};