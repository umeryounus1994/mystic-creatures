const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');
const { checkPartnerUserAuth } = require('../../../middlewares/authMiddlewarePartnerPanel');
const { checkFamilyUserAuth } = require('../../../middlewares/authMiddlewareFamilyPanel');
const mediaUpload = require('../../../middlewares/upload-aws-image');

// Public routes
router.get('/', activityController.getAll);

// Stats route (using different name to avoid conflict)
router.get('/dashboard-stats', checkPartnerUserAuth, activityController.getPartnerStats);
router.get('/search-activities', checkFamilyUserAuth, activityController.browseActivities);

// ID-based routes (must come after specific routes)
router.get('/:id', activityController.getById);

// Partner routes (require authentication)
router.post('/', checkPartnerUserAuth, mediaUpload.array('images', 5), activityController.create);
router.post('/:id', checkPartnerUserAuth, mediaUpload.array('images', 5), activityController.update);
router.delete('/:id', checkPartnerUserAuth, activityController.delete);

// Admin routes
router.post('/:id/approve', checkAdminUserAuth, activityController.approve);
router.post('/:id/reject', checkAdminUserAuth, activityController.reject);

// Public routes for family users

//router.get('/details/:id', activityController.getActivityDetails);

module.exports = router;
