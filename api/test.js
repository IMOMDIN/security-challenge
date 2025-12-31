module.exports = async (req, res) => {
  return res.json({ 
    status: 'API работает',
    time: new Date().toISOString()
  });
};