const express = require('express');

const tourController = require('../controllers/tourController');

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
  .get(tourController.getAllTours)
  .post(tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(tourController.deleteTour);

module.exports = router;
