const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');

// All routes require authentication
router.use(checkUserAuth);

// User routes
router.post('/', bookingController.create);
router.get('/my-bookings', bookingController.getUserBookings);
router.get('/:id', bookingController.getById);
router.put('/:id/cancel', bookingController.cancel);

module.exports = router;
