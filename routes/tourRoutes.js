const express = require('express');

const tourController = require('../controllers/tourController');
const authController = require('./../controllers/authController');

const router = express.Router();

// router.param('id', tourController.checkID);

router //псевдомаршрут
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router //отримання статичних даних
  .route('/tour-stats')
  .get(tourController.getTourStats);

router //щомісячний план за певний рік (тому змінна - рік)
  .route('/monthly-plan/:year')
  .get(tourController.getMonthlyPlan);

router
  .route('/')
  .get(authController.protect, tourController.getAllTours) //спочатку функція перевірки чи ввійшов в систему - при потребі видалити її!!!!!
  .post(tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(
    authController.protect,
    // визначаємо ролі користувачів, параметром передаємо, хто має право видаляти тури
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
