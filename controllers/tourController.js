const Tour = require('./../models/tourModel');
const APIfeatures = require('./../utils/apiFeatures');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = async (req, res) => {
  try {
    // EXECUTE QUERY
    const features = new APIfeatures(Tour.find(), req.query)
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
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: { tour },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    const newTour = await Tour.create(req.body);

    res.status(201).json({
      status: 'success',
      data: { tour: newTour },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      // вказуємо, що зміни мають проходити валідацію, як в SCHEMA
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: { tour },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

// конвеєр агрегації, в масиві визначаємо порядок етапів
exports.getTourStats = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};
