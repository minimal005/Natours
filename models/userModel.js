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
      // Кастомний валідатор працює тільки при CREATE and SAVE!!! З валідатора повертається тільки булеве значення
      validator: function (el) {
        return el === this.password;
      },
      message: 'Паролі не подібні!',
    },
  },
  passwordChangedAt: Date, //дата зміни паролю
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
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

const User = mongoose.model('User', userSchema);

module.exports = User;
