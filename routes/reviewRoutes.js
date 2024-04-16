const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

// За замовчуванням кожен маршрутизатор має доступ лише до параметрів своїх конкретних маршрутів
// Але тут, на цьому маршруті, немає ідентифікатора туру. Але ми все ще хочемо отримати доступ до ідентифікатора
// туру, який був на іншому маршрутизаторі. Отже, щоб отримати доступ до цього параметра на іншому маршрутизаторі,
// нам потрібно фізично об'єднати параметри. І ось що робить mergeParams, встановлений в true.
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  );

module.exports = router;
