const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');

// User routes
router.get('/my-notifications', checkUserAuth, notificationController.getUserNotifications);
router.put('/:id/read', checkUserAuth, notificationController.markAsRead);

// Admin routes
router.get('/', checkAdminUserAuth, notificationController.getAll);
router.post('/', checkAdminUserAuth, notificationController.create);
router.get('/:id', checkAdminUserAuth, notificationController.getById);

module.exports = router;