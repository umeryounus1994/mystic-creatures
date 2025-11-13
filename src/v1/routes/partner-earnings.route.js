const express = require('express');
const router = express.Router();
const partnerEarningsController = require('../controllers/partner-earnings.controller');
const { checkAuthOrigins } = require('../../../middlewares/authMiddlewareGenericAll');

// Partner earnings routes
router.get('/summary', checkAuthOrigins, partnerEarningsController.getEarningsSummary);
router.get('/history', checkAuthOrigins, partnerEarningsController.getEarningsHistory);
router.get('/analytics', checkAuthOrigins, partnerEarningsController.getEarningsAnalytics);

module.exports = router;
