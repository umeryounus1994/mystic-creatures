const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');

// Public routes
router.get('/', activityController.getAll);
router.get('/:id', activityController.getById);

// Partner routes (require authentication)
router.post('/', checkUserAuth, activityController.create);
router.put('/:id', checkUserAuth, activityController.update);
router.delete('/:id', checkUserAuth, activityController.delete);

// Admin routes
router.put('/:id/approve', checkAdminUserAuth, activityController.approve);
router.put('/:id/reject', checkAdminUserAuth, activityController.reject);

module.exports = router;
