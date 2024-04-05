const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

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
        message: 'Discount price {VALUE} should be below regular price',
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
    createAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    //кожного разу, коли дані фактично виводяться у вигляді JSON, віртуальні об'єкти будуть частиною вихідних даних
    toJSON: { virtuals: true },
    // не відображаються в DB
    toObject: { virtuals: true },
  },
);

// створюємо віртуальні поля / оск.немає потреби дублювати тривалість в тижнях
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// DOCUMENT MIDDLEWARE Проміжне програмне забезпечення - запускається перед реальною подією, тобто перед .save() і .create() (крім команди .insertMany()) і крім update (оновлення)
// this  вказує на поточний документ
tourSchema.pre('save', function (next) {
  // функція запускатиметься перед збереженням в DB - не відображається в DB
  this.slug = slugify(this.name, { lower: true });
  next();
});
/*tourSchema.pre('save', function (next) {
  console.log('Will save document...');
  next();
});

tourSchema.post('save', function (doc, next) {
  // функція має доступ не тільки до наступного, але й до документа, який щойно був збережений в DB
  console.log(doc);
  next();
});*/

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

// AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
  // видаляємо на початковому етапі секретні тури (true) з загального обляду
  //  добавляємо в ППЗ, оскільки у нас може бути декілька різних агрегацій і щоб спрацювало в кожній
  // .pipeline() - це масив агрегації, наш метод добавляємо в початок масиву
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
