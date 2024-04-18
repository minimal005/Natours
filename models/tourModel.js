const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [
        40,
        'A tour name must have less or qwual then 40 characters ',
      ],
      minlength: [
        10,
        'A tour name must have more or qwual then 10 characters ',
      ],
    },
    // підключили slugify для корекції назви поля, для введення в рядок запиту
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      // валідатор для String, масив дозволених значень
      enum: {
        // Ми не можемо прописати попередження,  оскільки у нас масив, тому треба розкрити об'єкт і прописати значення і попередження по окремості
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      // ф-ція mongoose округляє значення рейтингу
      set: (val) => Math.round(val * 10) / 10, // 4.666666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      // наш власний кастомний валідатор прописується функцією, яка має повернути true або  false
      // в цій функції this вказує на поточний документ лише при створенні, а не оновленні, отже ця функція при оновленні не працюватиме
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // початок локацій можна видалити і встановити все в локаціях
    startLocation: {
      // GeoJSON from MongoDB
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      // поряд з таким заповненням використовуємо метод .populate для розкриття інфо про об'єкт в .pre
      // (під моделлю прописано)
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    //кожного разу, коли дані фактично виводяться у вигляді JSON, віртуальні об'єкти будуть частиною вихідних даних
    toJSON: { virtuals: true },
    // не відображаються в DB
    toObject: { virtuals: true },
  },
);

// tourSchema.index({ price: 1 }) або price: -1 сортування за зростанням або спаданням
//  потрібно ретельно вивчити шаблони доступу до нашого додатку, щоб з'ясувати, які поля запитуються найчастіше,
// а потім встановити індекси для цих полів
// кожен індекс використовує ресурси, тому потрібно встановлювати тільки по потребі
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// індекс для геолокаційних даних, щоб ми для пошуку турів з вказанням дистанцій
// використовується індекс 2D-сфери.
tourSchema.index({ startLocation: '2dsphere' });

// створюємо віртуальні поля / оск.немає потреби дублювати тривалість в тижнях
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate. Ми можемо отримати доступ до всіх відгуків про певний тур, але не зберігаючи цей масив
// ідентифікаторів у турі.
// щоб не перегружати модель зайвою вагою, оскільки тур - батьківський елемент над review і ми вирішили у
// відгуках давати посилання, а не навпаки,
// тому робимо Virtual populate, щоб мати можливість переглянути відгуки у турі
// після цього прописати в tourController в getTour метод populate, щоб показувались відгуки
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// DOCUMENT MIDDLEWARE Проміжне програмне забезпечення - запускається перед реальною подією, тобто перед .save()
// і .create() (крім команди .insertMany()) і крім update (оновлення)
// this  вказує на поточний документ
tourSchema.pre('save', function (next) {
  // функція запускатиметься перед збереженням в DB - не відображається в DB
  this.slug = slugify(this.name, { lower: true });
  next();
});

// якщо ми хочемо реалізувати, щоб в Tour вбудовувалась вся інформація про юзерів-гідів, а не їх посилання
// тоді в моделі прописуємо guides: Array  і наступний код
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// QUERY MIDDLEWARE
// this  вказує на поточний запит
// регулярний вираз для запиту, який розпочинається з find (findOne, findById і т.д.)

tourSchema.pre(/^find/, function (next) {
  // наприклад маємо секретний тур для VIP клієнтів (прописати в SCHEMA!!!!)
  this.find({ secretTour: { $ne: true } });

  // this.start = Date.now()
  next();
});

/*tourSchema.post(/^find/, function (docs, next) {
  console.log(`Пройшло часу ${Date.now - this.start} мілісекунд`);
  next();
});*/

// метод .populate - метод mongoose - МОЖЕ ВПЛИНУТИ НА ЕФЕКТИВНІСТЬ, ЯКЩО ВЕЛИКИЙ ДОДАТОК
// метод .populate('guides') розкриє всю інформацію про цей гідів при отриманні туру, а не в самій DB
//.populate({path: 'guides', select: '-__v -passwordChangedAt}) - метод розкриє інфо про гідів, але вилучить
// інфо про __v і про дату зміну пароля
//  без цього методу ми отримаємо тільки ідентифікатори гідів
// Можемо окремо прописати цей метод в tourController без .pre, якщо хочему, щоб вся інфа виводилась
// тільки в окремих випадках
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   // видаляємо на початковому етапі секретні тури (true) з загального обляду
//   //  добавляємо в ППЗ, оскільки у нас може бути декілька різних агрегацій і щоб спрацювало в кожній
//   // .pipeline() - це масив агрегації, наш метод добавляємо в початок масиву
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
