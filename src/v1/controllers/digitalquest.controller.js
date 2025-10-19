const DigitalQuest = require('../models/digitalquest.model');
const QuestPurchase = require('../models/questpurchase.model');
const { generateResponse } = require('../utils/response');

const digitalQuestController = {
    // Create quest
    create: async (req, res) => {
        try {
            const quest = new DigitalQuest(req.body);
            await quest.save();
            
            return generateResponse(res, 201, 'Digital quest created successfully', quest);
        } catch (error) {
            return generateResponse(res, 400, 'Error creating quest', null, error.message);
        }
    },

    // Get all quests
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, quest_type, category, status } = req.query;
            
            const filter = {};
            if (quest_type) filter.quest_type = quest_type;
            if (category) filter.category = category;
            if (status) filter.status = status;
            
            const quests = await DigitalQuest.find(filter)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await DigitalQuest.countDocuments(filter);
            
            return generateResponse(res, 200, 'Quests retrieved successfully', {
                quests,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving quests', null, error.message);
        }
    },

    // Get quest by ID
    getById: async (req, res) => {
        try {
            const quest = await DigitalQuest.findById(req.params.id);
            
            if (!quest) {
                return generateResponse(res, 404, 'Quest not found');
            }
            
            return generateResponse(res, 200, 'Quest retrieved successfully', quest);
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving quest', null, error.message);
        }
    },

    // Update quest
    update: async (req, res) => {
        try {
            const quest = await DigitalQuest.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            
            if (!quest) {
                return generateResponse(res, 404, 'Quest not found');
            }
            
            return generateResponse(res, 200, 'Quest updated successfully', quest);
        } catch (error) {
            return generateResponse(res, 400, 'Error updating quest', null, error.message);
        }
    },

    // Delete quest
    delete: async (req, res) => {
        try {
            const quest = await DigitalQuest.findByIdAndDelete(req.params.id);
            
            if (!quest) {
                return generateResponse(res, 404, 'Quest not found');
            }
            
            return generateResponse(res, 200, 'Quest deleted successfully');
        } catch (error) {
            return generateResponse(res, 500, 'Error deleting quest', null, error.message);
        }
    }
};

module.exports = digitalQuestController;