const express = require('express');
const morgan = require('morgan');

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./utils/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1) ГЛОБАЛЬНЕ ППЗ
// SECURITY HTTP заголовків
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// SECURITY Встановлюємо ліміт (в даному випадку 100) на кількість запитів з одного API
// Його банки ставлять на введення пароля
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message:
    'Занадто багато запитів з цього IP, Будь ласка, спробуйте знову через годину!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // limit: '10kb' - обмеження ваги прийнятих файлів

// SECURITY Санітарна обробка даних від ін'єкцій NoSQL запитів
app.use(mongoSanitize());

// SECURITY Санітарна обробка даних від міжсайтових скриптових атак XSS
app.use(xss());

// SECURITY Запобігання забрудненню параметрів
app.use(
  hpp({
    //в баліий список вносимо параметри, які дозволяємо дублювати в рядку запиту
    // треба почитати документацію по цьому
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Serving static files
app.use(express.static(`${__dirname}/public`));

// Тестове ППЗ
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// обробник для всіх маршрутів, які не кешуються нашими маршрутизаторами
app.all('*', (req, res, next) => {
  next(
    new AppError(`Неможливо знайти ${req.originalUrl} на цьому сервері!`, 404),
  );
});

// обробка всіх операційних помилок, які можуть виникнути
app.use(globalErrorHandler);

module.exports = app;
