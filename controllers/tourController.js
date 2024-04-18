const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' }); // reviews - передаємо об'єкт для .populate
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// конвеєр агрегації, в масиві визначаємо порядок етапів
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      //вибірка документів по певному параметру
      $match: { ratingsAverage: { $gte: 4.5 } },
    },

    {
      //обчислюємо середній рейтинг за допомогою
      $group: {
        // оскільки в id  вказали $difficulty, то нам розбило статистику по групам складності (таким чином можна розбивати на групи)
        _id: { $toUpper: '$difficulty' },
        //для кожного документа, який проходитиме через конвеєр, буде додаватись 1, щоб бачити загальну кількість турів
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        // оператор $avg повертає середнє значення
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },

    {
      //сортування, для сортування використовуємо змінні, які ми вказали в розділі $group;
      // 1 - зростанняя; -1 - спадання
      $sort: { avgPrice: 1 },
    },

    /* {
        // ми можемо повторно використовувати етапи
        // наприклад зробити вибірку по складності (не вибирати 'EASY')
        // прописуємо великими літерами, оскільки ми вказали $toUpper в $group
        $match: { _id: { $ne: 'EASY' } },
      },*/
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      // на кожну дату створить окремий документ, тобто розгорне документи по датам
      $unwind: '$startDates',
    },
    {
      // відбір документів (в даному випадку по року, вказуємо проміжки)
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        //витягуємо місяці з дати
        _id: { $month: '$startDates' },
        //рахуємо кількість турів
        numTourStarts: { $sum: 1 },
        //повернемо масив назв
        tours: { $push: '$name' },
      },
    },
    {
      //додавання нового поля
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      // сортування по кількості турів в місяці
      $sort: { numTourStarts: -1 },
    },
    {
      // кількість документів на сторінці/ по потребі
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: { plan },
  });
});

// тур межах певної відстані від дому, center - це точка, де ви проживаєте
// unit,    :unit - одиниця виміру
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // щоб отримати радіани, ділиться відстань на радіус землі
  // тобто коли відстань в милях, то / 3963.2, а якщо в км, то / 6378.1
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400,
      ),
    );
  }
  const tours = await Tour.find({
    // $geoWithin знаходить документи в межах певної відстані.
    // радіус приймається тільки в радіанах
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // конвертація відстані м в миліб або в км
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400,
      ),
    );
  }

  const distances = await Tour.aggregate([
    {
      // єдиний етап конвеєра геопросторової агрегації
      // він завжди має бути першим у черзі
      // обов'язково має бути індекс, він у нас прописаний в tourModel
      // якби у нас було декілька геопросторових індексів, то ми мусили би використовувати параметр key
      //   для визначення поля, яке ми хочему обчислювати
      $geoNear: {
        // near - точка, до якої потрібно обчислити відстані
        near: {
          type: 'Point',
          // множимо на 1, щоб перевести їх в цифри
          coordinates: [lng * 1, lat * 1],
        },
        // distanceField - це назва поля, яке буде створено і в якому зберігатимуться всі обчислені відстані.
        distanceField: 'distance',
        // distanceMultiplier вказуємо на скільки ділити відстань(функція прописана зверху)
        distanceMultiplier: multiplier,
      },
    },
    {
      // $project - видаємо назви полів, які хочему зберегти при виведенні на екран
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
