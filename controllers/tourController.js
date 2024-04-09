const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  // EXECUTE QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const tours = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours },
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);

  if (!tour) {
    console.log('+');
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
});

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { tour: newTour },
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    // вказуємо, що зміни мають проходити валідацію, як в SCHEMA
    runValidators: true,
  });

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { tour },
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    return next(new AppError('Не знайдений тур за цією ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

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
        numTours: { $sum: 1 }, //для кожного документа, який проходитиме через конвеєр, буде додаватись 1, так ми порахуємо загальну кількість турів (документів)
        numRatings: { $sum: '$ratingsQuantity' },
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
