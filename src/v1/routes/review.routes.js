const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');

// Public routes
router.get('/activity/:activity_id', reviewController.getActivityReviews);

// User routes
router.post('/', checkUserAuth, reviewController.create);
router.get('/my-reviews', checkUserAuth, reviewController.getUserReviews);

// Partner routes
router.get('/partner/my-reviews', checkUserAuth, reviewController.getPartnerReviews);
router.post('/:id/respond', checkUserAuth, reviewController.respondToReview);

// Admin routes
router.get('/', checkAdminUserAuth, reviewController.getAll);
router.put('/:id/moderate', checkAdminUserAuth, reviewController.moderate);

module.exports = router;