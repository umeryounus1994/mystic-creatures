const express = require('express');
const router = express.Router();
const digitalQuestController = require('../controllers/digitalquest.controller');
const { checkUserAuth } = require('../../../middlewares/authMiddleware');
const { checkAdminUserAuth } = require('../../../middlewares/authMiddlewareAdminPanel');

// Public routes
router.get('/', digitalQuestController.getAll);
router.get('/:id', digitalQuestController.getById);

// Admin routes
router.post('/', checkAdminUserAuth, digitalQuestController.create);
router.put('/:id', checkAdminUserAuth, digitalQuestController.update);
router.delete('/:id', checkAdminUserAuth, digitalQuestController.delete);

module.exports = router;