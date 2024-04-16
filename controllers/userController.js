const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// проходимось по запиту користувача і оновлюємо тільки дозволені поля
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

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

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message:
      'Цей шлях не визначений, будь ласка, використайте /signup замість цього',
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Оновлення всіх даних користувача, які користувач може оновити (наприклад, iм'я, email), пароль тут не змінюється
exports.updateUser = factory.updateOne(User);
// може видаляти тільки адмін
exports.deleteUser = factory.deleteOne(User);
