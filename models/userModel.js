const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Будь ласка, вкажіть ваше ім"я!'],
  },
  email: {
    type: String,
    required: [true, 'Будь ласка, вкажіть ваш email'],
    unique: true,
    lowercase: true,
    validate: [
      // за допомогою пакета перевіряємо валідність email
      validator.isEmail,
      'Будь ласка, вкажіть дійсну електронну адресу',
    ],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'], //'moderator', 'contributor', 'member'
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Будь ласка, введіть пароль'],
    minlength: 8,
    // пароль ніколи не з'явиться в запиті
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Будь ласка, підтвердьте свій пароль'],
    validate: {
      // Кастомний валідатор працює тільки при CREATE and SAVE!!!,
      // тому не використовуємо User.findByIdAndUpdate для всього,що пов'язано з паролями
      // З валідатора повертається тільки булеве значення
      validator: function (el) {
        return el === this.password;
      },
      message: 'Паролі не подібні!',
    },
  },
  passwordChangedAt: Date, //дата зміни паролю
  passwordResetToken: String,
  passwordResetExpires: Date,
  // чи активний аккаунт(юзер може видалити себе)
  active: {
    type: Boolean,
    default: true,
    // // не показувати в запиті
    select: false,
  },
});

// тільки при зміні або створенні пароля відбуватиметься шифрування пароля
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); //якщо пароль не був змінений, то викликаємо наступне ППЗ

  // Хешуємо пароль
  this.password = await bcrypt.hash(this.password, 12);

  // Видаляємо passwordConfirm, щоб воно не зберігалося в DB (він нам був потрібен тільки для валідації)
  this.passwordConfirm = undefined;
  next();
});

// оновлюємо passwordChangedAt для поточного користувача
userSchema.pre('save', function (next) {
  // .isNew - властивість означає, якщо документ новий (mongoose)
  if (!this.isModified('password') || this.isNew) return next();
  // іноді токен створюється раніше, ніж відбувається заміна пароля, тому страхуємось і віднімаємо 1сек (1000)
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// отже якщо ми шукаємо користувачів, то покаже всі, хто не має false (тих, хто видалив свій аакаунт)
userSchema.pre(/^find/, function (next) {
  // ставимо метод виключення, тому що не всі юзери взагалі мають цей параметр
  this.find({ active: { $ne: false } });
  next();
});

// функція, яка перевірятиме, чи збігається заданий пароль з тим, що зберігається в документі (хешованим)
// створюємо метод екземпляра
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassport,
) {
  return await bcrypt.compare(candidatePassword, userPassport);
};

// перевірка, чи не змінювався пароль (після випуску токена) JWTTimestamp - мітка часу, яка вказує коли випущений токен
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // якщо властивість існує в моделі, значить пароль змінювався
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  // Якщо пароль не змінено
  return false;
};

// Генерування рандомного токена при скиданні пароля
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); //32 - кількість символів конвертуємо в рядок

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  // Встановлюємо час дії рандомного токена - 10хв
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
