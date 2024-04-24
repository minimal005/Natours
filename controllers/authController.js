const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// створення і відправка токена користувачу
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    // ця властивіть видаляє cookie після закінчення терміну дії
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    // для запобігання міжсайтових скриптових атак
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; //обов'язкова вимога https

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// ---------РЕГІСТРАЦІЯ НА САЙТІ
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
  createSendToken(newUser, 201, res);
});

// ---------АВТОРИЗАЦІЯ НА САЙТІ
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
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// функція перевірки, чи авторизований користувач
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Зчитуємо токен з заголовку авторизації і перевіряємо його
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // зчитуємо jwt з файлу cookie
    token = req.cookies.jwt;
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

// Лише для відтворених сторінок, без помилок!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) підтверджуємо токен
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Перевіряємо, чи все ще існує користувач
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Чи не змінював пористувач свій пароль
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // Якщо все відбулось корректно, то користувач зареєстрований
      // робимо доступ користувачу до шаблонів
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// -------ВИЗНАЧЕННЯ РОЛЕЙ КОРИСТУВАЧІВ, параметром передаємо, хто має право робити якісь дії
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

// 1. Забув пароль forgotPassword
// 2. Скинув пароль resetPassword
// 3. Замінив пароль updatePassword

// -------ЯКЩО ЗАБУВ ПАРОЛЬ
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Отримати користувача на основі email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('Немає користувача з такою email адресою.', 404));
  }

  // 2) Згенерувати рандомний токен
  const resetToken = user.createPasswordResetToken();
  // деактивація всіх валідаторів, які вказані в схемі
  await user.save({ validateBeforeSave: false });

  // // 3) Відправити цей токен через email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Забули свій пароль? Надішліть запит на ВИПРАВЛЕННЯ з новим паролем і підтвердженням пароля на: ${resetURL}.\nЯкщо ви не забули свій пароль, проігноруйте цей електронний лист!`;

  try {
    // відправка електронною поштою
    await sendEmail({
      email: user.email,
      subject: 'Ваш маркер скидання пароля (дійсний 10 хвилин)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500,
    );
  }
});

// --------СКИДАЄМО ПАРОЛЬ resetPassword
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Отримати користувача на основі токена, але спочатку токен хешуємо

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) Встановлюємо новий пароль, якщо термін дії токена ще не закінчився
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Оновлюємо властивість changedPasswordAt для користувача (в ППЗ)
  // 4) Зайти в систему, надіслати клієнту веб-токен
  createSendToken(user, 200, res);
});

// -------МОЖЛИВІСТЬ ЗАМІНИТИ ПАРОЛЬ
// з поняття безпеки завжди треба запитувати поточний пароль при оновленні пароля
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Отримуємо користувача з колекції
  const user = await User.findById(req.user.id).select('+password');

  // 2) Перевіряємо, чи введено правильний пароль
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) Якщо пароль правильний, то оновлюємо його
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate не працюватиме, тому що для цієї функції не спрацьовує валідація, яка прописана в моделі!
  //  User.findByIdAndUpdate також не працюватиме, з ППЗ, яке прописано під схемою userSchema.pre()

  // 4) Заходимо в систему, відправляючи користувачу JWT
  createSendToken(user, 200, res);
});
