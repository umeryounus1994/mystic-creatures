const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { checkFamilyUserAuth } = require('../../../middlewares/authMiddlewareFamilyPanel');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');
const { checkPartnerUserAuth } = require('../../../middlewares/authMiddlewarePartnerPanel');

// Family user booking routes
router.post('/create', checkFamilyUserAuth, bookingController.createBooking);
router.post('/confirm-booking', checkPartnerUserAuth, bookingController.confirmBooking);
router.get('/my-bookings', checkFamilyUserAuth, bookingController.getUserBookings);
router.get('/:id', checkFamilyUserAuth, bookingController.getById);
router.post('/cancel-booking', checkPartnerUserAuth, bookingController.cancel);

// Partner booking routes
router.get('/partner/my-bookings', checkPartnerUserAuth, bookingController.getPartnerBookings);

// Admin booking routes
router.get('/admin/all-bookings', checkAdminUserAuth, bookingController.getAllBookings);

module.exports = router;
