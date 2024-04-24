const path = require('path');
const express = require('express');
const morgan = require('morgan');

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./utils/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
// const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// вказуємо Еxpress, який шаблонізатор будемо використовувати
// його ніде не треба встановлювати, Еxpress його підтримує з коробки
app.set('view engine', 'pug');
// визначаємо, в якій папці знаходяться наші папки pug
app.set('views', path.join(__dirname, 'views'));

// 1) ГЛОБАЛЬНЕ ППЗ

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

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
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// SECURITY Санітарна обробка даних від ін'єкцій NoSQL запитів
app.use(mongoSanitize());

// SECURITY Санітарна обробка даних від міжсайтових скриптових атак XSS
app.use(xss());

// SECURITY Запобігання забрудненню параметрів
app.use(
  hpp({
    //в білий список вносимо параметри, які дозволяємо дублювати в рядку запиту
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

// Тестове ППЗ
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});

// ШЛЯХИ
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// обробник для всіх маршрутів, які не кешуються нашими маршрутизаторами
app.all('*', (req, res, next) => {
  next(
    new AppError(`Неможливо знайти ${req.originalUrl} на цьому сервері!`, 404),
  );
});

// обробка всіх операційних помилок, які можуть виникнути
app.use(globalErrorHandler);

module.exports = app;
