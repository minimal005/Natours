const express = require('express');
const morgan = require('morgan');

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

// 3. Маршрути

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// обробник для всіх маршрутів, які не кешуються нашими маршрутизаторами
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Неможливо знайти ${req.originalUrl} на цьому сервері`,
  });
});

module.exports = app;
