const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Загрузка базы данных
let db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

// Middleware для защиты
app.use(helmet()); // Защита HTTP заголовков
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Защита от брутфорса - максимум 5 попыток за 15 минут
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' }
});