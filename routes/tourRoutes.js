const express = require('express');

const tourController = require('../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// router.param('id', tourController.checkID);

// POST /tour/234fad4/reviews
// GET /tour/234fad4/reviews

// перенаправляємо цей маршрут на оглядовий маршрутизатор
router.use('/:tourId/reviews', reviewRouter);

router //псевдомаршрут
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router //отримання статичних даних
  .route('/tour-stats')
  .get(tourController.getTourStats);

router //щомісячний план за певний рік (тому змінна - рік)
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    // визначаємо ролі користувачів, параметром передаємо, хто має право видаляти тури
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
