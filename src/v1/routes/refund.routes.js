const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refund.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');

// User routes
router.post('/', checkUserAuth, refundController.create);
router.get('/my-refunds', checkUserAuth, refundController.getUserRefunds);

// Admin routes
router.get('/', checkAdminUserAuth, refundController.getAll);
router.get('/:id', checkAdminUserAuth, refundController.getById);
router.put('/:id/process', checkAdminUserAuth, refundController.process);

module.exports = router;