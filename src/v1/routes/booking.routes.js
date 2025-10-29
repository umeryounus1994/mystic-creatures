const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { checkFamilyUserAuth } = require('../../../middlewares/authMiddlewareFamilyPanel');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');

// Family user booking routes
router.post('/create', checkFamilyUserAuth, bookingController.createBooking);
router.post('/confirm', checkFamilyUserAuth, bookingController.confirmBooking);
router.get('/my-bookings', checkFamilyUserAuth, bookingController.getUserBookings);
router.get('/:id', checkFamilyUserAuth, bookingController.getById);
router.put('/:id/cancel', checkAdminUserAuth, bookingController.cancel);

module.exports = router;
