const failedAttempts = new Map();
const maxAttempts = 5;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userData = failedAttempts.get(ip);
    
    if (!userData) {
      return res.status(200).json({
        attempts: 0,
        attemptsLeft: maxAttempts,
        blocked: false
      });
    }
    
    const attemptsLeft = maxAttempts - userData.attempts;
    const blockTime = 15 * 60 * 1000;
    const timeSinceLastAttempt = Date.now() - userData.lastAttempt;
    
    const blocked = userData.attempts >= maxAttempts && timeSinceLastAttempt < blockTime;
    
    return res.status(200).json({
      attempts: userData.attempts,
      attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0,
      blocked: blocked,
      lastAttempt: userData.lastAttempt
    });
    
  } catch (error) {
    console.error('Attempts error:', error);
    return res.status(200).json({
      attempts: 0,
      attemptsLeft: maxAttempts,
      blocked: false
    });
  }
};