// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Відгук не повинен бути незаповненим!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Якому туру належить цей відгук.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Якому користувачу належить цей відгук'],
    },
  },
  {
    //   прописуємо, щоб віртуальньні властивості також відображалися в JSON та об'єктному виводі
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// за допомогою індексів робимо, щоб юзер міг залишити тільки по  1 відгуку певному туру, тобто пара тур-юзер унікальна
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// ф-ція бере ідентифікатор туру і обчислює середню оцінку та кількість оцінок, що існують у нашій
// колекції для цього конкретного туру.

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      //вибірка документів по певному параметру
      $match: { tour: tourId },
    },
    {
      // На етапі групування перше поле, яке нам потрібно вказати, - це ідентифікатор, тобто _id, а потім
      // загальне поле, яке об'єднує всі документи, і за яким ми хочемо їх згрупувати,
      $group: {
        _id: '$tour',
        // для кожного документа, який проходитиме через конвеєр, буде додаватись 1, щоб бачити загальну кількість оцінок
        nRating: { $sum: 1 },
        // оператор $avg повертає середнє значення
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// при збереженні документа розрахувається середня оцінка відгуків
reviewSchema.post('save', function () {
  // ми мали би написати Review.calcAverageRatings(this.tour), але оскільки змінна Review ще не визначена, тому записуємо:
  // this.constructor вказує на нашу модель
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
// якщо ми змінимо .pre на .post, то ми не матимемо доступу до запитів, тому наступний код
// розбиваеємо на 2 етапи: .pre i .post
// оновлюємо середній рейтинг при зміні і видаленні документів
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // ми маємо доступ до запиту і отримуємо доступ до документа
  this.r = await this.clone().findOne();
  next();
});

// оновлюємо середній рейтинг при зміні і видаленні документів
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
