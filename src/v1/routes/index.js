const express = require('express');
const router = express.Router();

// Import route modules (matching existing file names)
const userRoutes = require('./user.route');
const activityRoutes = require('./activity.routes');
const bookingRoutes = require('./booking.routes');
const digitalQuestRoutes = require('./digitalquest.routes');
const commissionRoutes = require('./commission.routes');
const payoutRoutes = require('./payout.routes');
const refundRoutes = require('./refund.routes');
const notificationRoutes = require('./notification.routes');
const reviewRoutes = require('./review.routes');

// Mount routes
router.use('/users', userRoutes);
router.use('/activities', activityRoutes);
router.use('/booking', bookingRoutes);
router.use('/quests', digitalQuestRoutes);
router.use('/commissions', commissionRoutes);
router.use('/payouts', payoutRoutes);
router.use('/refunds', refundRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reviews', reviewRoutes);

module.exports = router;
