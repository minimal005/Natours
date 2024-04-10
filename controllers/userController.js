const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// проходимось по запиту користувача і оновлюємо тільки дозволені поля
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});
//зміни/оновлення поточного авторизованого користувача
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) створюємо помилку, якщо юзер відправляє пароль
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Цей шлях не призначений для зміни пароля. Будь ласка, використайте шлях /updateMyPassword.',
        400,
      ),
    );
  }

  // 2) Фільтруємо поля, які ми дозволяємо оновлювати
  // тут перераховані поля, які можна змінювати в профілі
  const filteredBody = filterObj(req.body, 'name', 'email'); // можна дозволити юзеру завантажувати зображення

  // 3) Оновлюємо документ юзера
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, //повертає новий об'єкт, а не старий
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// юзер може сам себе видалити в профілі
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};

// Оновлення всіх даних користувача, які користувач може оновити (наприклад, iм'я, email)
exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};
exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined',
  });
};
