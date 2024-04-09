const express = require('express');
const morgan = require('morgan');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./utils/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.static(`${__dirname}/public`));

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
