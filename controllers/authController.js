const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
// реєстрація
exports.signup = catchAsync(async (req, res, next) => {
  // такою реєстрацією ми робимо неможливим створювати собі окремі ролі(адмін, модератор).
  //   При побребі ця роль редагується в Compass
  // ці властивості зберігаються в базі даних
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    //цей рядок дає можливість при реєстрації самим обирати собі ролі
    // role: req.body.role,
  });

  //   створюємо токен з корисним навантаженням у вигляді ID юзера для доступу до захищених маршрутів
  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1. перевірка чи email і password існують
  if (!email || !password) {
    return next(new AppError('Будь ласка, введіть email i пароль', 400));
  }

  // 2. перевірити чи існує користувач і чи правильний пароль
  // оскільки пароль при запиті не висвітлює (прописано в userModel.js), а він нам потрібен
  // в цих вихідних даних для перевірки, то пароль додаємо через select
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Невірний email або пароль', 401));
  }

  // 3. якщо все добре, відправити token клієнту
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
});

// функція перевірки, чи авторизований користувач
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Зчитуємо токен з заголовку авторизації і перевіряємо його
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError(
        'Ви не ввійшли до системи! Будь ласка, увійдіть, щоб отримати доступ.',
        401,
      ),
    );
  }

  // 2) Верифікація токена
  // розшифровані дані з корисним навантаженням з цього токена
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Перевірка, чи користувач, який хоче отримати доступ ще існує (чи його не видалив адміністратор)
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'Користувача, якому належав цей токен, більше не існує',
        401,
      ),
    );
  }

  //   // 4) Чи не змінив користувач пароль після випуску JWT
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'Користувач нещодавно змінив пароль! Будь ласка, увійдіть знову.',
        401,
      ),
    );
  }

  // Надаємо доступ до захищеного маршруту
  req.user = currentUser;
  next();
});

// визначення ролей користувачів, параметром передаємо, хто має право робити якісь дії
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };
};
