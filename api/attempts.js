module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  return res.status(200).json({
    attempts: 0,
    attemptsLeft: 5,
    blocked: false
  });
};