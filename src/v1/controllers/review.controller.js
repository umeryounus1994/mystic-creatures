const Review = require('../models/review.model');
const { generateResponse } = require('../utils/response');

const reviewController = {
    // Get reviews for a specific activity (Public)
    getActivityReviews: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const { activity_id } = req.params;
            
            const filter = { 
                activity_id, 
                status: 'approved' 
            };
            
            const reviews = await Review.find(filter)
                .populate('user_id', 'first_name last_name')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Review.countDocuments(filter);
            
            return generateResponse(res, 200, 'Activity reviews retrieved successfully', {
                reviews,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving activity reviews', null, error.message);
        }
    },

    // Create new review (User)
    create: async (req, res) => {
        try {
            const {
                booking_id,
                activity_id,
                partner_id,
                rating,
                review_text,
                photos
            } = req.body;
            
            const review = new Review({
                booking_id,
                user_id: req.user.id,
                activity_id,
                partner_id,
                rating,
                review_text,
                photos
            });
            
            await review.save();
            
            return generateResponse(res, 201, 'Review created successfully', review);
        } catch (error) {
            return generateResponse(res, 400, 'Error creating review', null, error.message);
        }
    },

    // Get user's reviews
    getUserReviews: async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const filter = { user_id: req.user.id };
            if (status) filter.status = status;
            
            const reviews = await Review.find(filter)
                .populate('activity_id', 'title')
                .populate('partner_id', 'first_name last_name')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Review.countDocuments(filter);
            
            return generateResponse(res, 200, 'User reviews retrieved successfully', {
                reviews,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving user reviews', null, error.message);
        }
    },

    // Get partner's reviews
    getPartnerReviews: async (req, res) => {
        try {
            const { page = 1, limit = 10, status } = req.query;
            
            const filter = { partner_id: req.user.id };
            if (status) filter.status = status;
            
            const reviews = await Review.find(filter)
                .populate('user_id', 'first_name last_name')
                .populate('activity_id', 'title')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Review.countDocuments(filter);
            
            return generateResponse(res, 200, 'Partner reviews retrieved successfully', {
                reviews,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving partner reviews', null, error.message);
        }
    },

    // Respond to review (Partner)
    respondToReview: async (req, res) => {
        try {
            const { partner_response } = req.body;
            
            const review = await Review.findOneAndUpdate(
                { 
                    _id: req.params.id, 
                    partner_id: req.user.id 
                },
                { 
                    partner_response,
                    partner_response_date: new Date()
                },
                { new: true }
            );
            
            if (!review) {
                return generateResponse(res, 404, 'Review not found or unauthorized');
            }
            
            return generateResponse(res, 200, 'Response added successfully', review);
        } catch (error) {
            return generateResponse(res, 400, 'Error responding to review', null, error.message);
        }
    },

    // Get all reviews (Admin only)
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, rating } = req.query;
            
            const filter = {};
            if (status) filter.status = status;
            if (rating) filter.rating = rating;
            
            const reviews = await Review.find(filter)
                .populate('user_id', 'first_name last_name email')
                .populate('activity_id', 'title')
                .populate('partner_id', 'first_name last_name')
                .populate('moderated_by', 'first_name last_name')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ created_at: -1 });
                
            const total = await Review.countDocuments(filter);
            
            return generateResponse(res, 200, 'Reviews retrieved successfully', {
                reviews,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            });
        } catch (error) {
            return generateResponse(res, 500, 'Error retrieving reviews', null, error.message);
        }
    },

    // Moderate review (Admin only)
    moderate: async (req, res) => {
        try {
            const { status, moderation_notes, is_verified } = req.body;
            
            const review = await Review.findByIdAndUpdate(
                req.params.id,
                {
                    status,
                    moderation_notes,
                    is_verified: is_verified || false,
                    moderated_by: req.user.id
                },
                { new: true, runValidators: true }
            );
            
            if (!review) {
                return generateResponse(res, 404, 'Review not found');
            }
            
            return generateResponse(res, 200, 'Review moderated successfully', review);
        } catch (error) {
            return generateResponse(res, 400, 'Error moderating review', null, error.message);
        }
    }
};

module.exports = reviewController;