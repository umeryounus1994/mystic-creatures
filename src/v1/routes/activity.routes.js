const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');
const { checkPartnerUserAuth } = require('../../../middlewares/authMiddlewarePartnerPanel');
const mediaUpload = require('../../../middlewares/upload-aws-image');

// Public routes
router.get('/', activityController.getAll);

// Stats route (using different name to avoid conflict)
router.get('/dashboard-stats', checkPartnerUserAuth, activityController.getPartnerStats);

// ID-based routes (must come after specific routes)
router.get('/:id', activityController.getById);

// Partner routes (require authentication)
router.post('/', checkPartnerUserAuth, mediaUpload.array('images', 5), activityController.create);
router.post('/:id', checkPartnerUserAuth, mediaUpload.array('images', 5), activityController.update);
router.delete('/:id', checkPartnerUserAuth, activityController.delete);

// Admin routes
router.put('/:id/approve', checkAdminUserAuth, activityController.approve);
router.put('/:id/reject', checkAdminUserAuth, activityController.reject);

module.exports = router;
