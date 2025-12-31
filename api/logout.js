module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  // Просто возвращаем JSON
  return res.status(200).json({
    success: true,
    message: 'Вы вышли из системы'
  });
};