const MysteryBagModel = require("../models/mysterybag.model");
const UserMysteryBagModel = require("../models/usermysterybag.model");
const apiResponse = require("../../../helpers/apiResponse");
const { ObjectId } = require('mongodb');
const mysteryBagHelper = require("../../../helpers/mysterybag");

const createMysteryBag = async (req, res, next) => {
    try {
        const { ...bagDetails } = req.body;
        
        var location = { 
            type: 'Point', 
            coordinates: [req.body?.latitude, req.body?.longitude] 
        };
        
        bagDetails.location = location;
        bagDetails.reward_file = req.files['reward_file'] ? req.files['reward_file'][0].location : "";
        bagDetails.created_by = req.user.id;
        
        const createdBag = new MysteryBagModel(bagDetails);
        
        createdBag.save(async (err) => {
            if (err) {
                return apiResponse.ErrorResponse(
                    res,
                    "System went wrong, Kindly try again later"
                );
            }
            return apiResponse.successResponseWithData(
                res,
                "Mystery bag created successfully",
                createdBag
            );
        });
    } catch (err) {
        next(err);
    }
};

const getNearbyMysteryBags = async (req, res, next) => {
    try {
        if (req.body.latitude == undefined || req.body.longitude == undefined) {
            return apiResponse.ErrorResponse(
                res,
                "Lat, Long is required"
            );
        }
        
        const latitude = req.body.latitude;
        const longitude = req.body.longitude;
        
        const mysteryBags = await MysteryBagModel.find({status: 'active'})
            .sort({ created_at: -1 })
            .populate('created_by', 'username');
            
        const nearbyBags = await mysteryBagHelper.getNearbyMysteryBags(
            mysteryBags, 
            req.user.id, 
            latitude, 
            longitude
        );
        
        return res.json({
            status: nearbyBags.length > 0 ? true : false,
            message: nearbyBags.length > 0 ? "Data Found" : "No mystery bags found",
            data: nearbyBags
        });
    } catch (err) {
        next(err);
    }
};

const interactWithMysteryBag = async (req, res, next) => {
    try {
        const id = req.params.id;
        const action = req.body.action; // 'view' or 'collect'
        
        const mysteryBag = await MysteryBagModel.findOne({ _id: new ObjectId(id) });
        if (!mysteryBag) {
            return apiResponse.notFoundResponse(res, "Mystery bag not found!");
        }
        
        // Check if user already interacted
        const existingInteraction = await UserMysteryBagModel.findOne({ 
            user_id: new ObjectId(req.user.id), 
            mystery_bag_id: new ObjectId(id) 
        });
        
        if (existingInteraction) {
            return apiResponse.ErrorResponse(res, "Already interacted with this mystery bag");
        }
        
        // Validate action based on bag type
        if (mysteryBag.bag_type === "view-only" && action === "collect") {
            return apiResponse.ErrorResponse(res, "This mystery bag is view-only");
        }
        
        const status = action === "collect" ? "collected" : "viewed";
        
        const userInteraction = new UserMysteryBagModel({
            mystery_bag_id: id,
            user_id: req.user.id,
            status: status
        });
        
        await userInteraction.save();
        
        return apiResponse.successResponseWithData(
            res,
            `Mystery bag ${status} successfully`,
            {
                bag_title: mysteryBag.bag_title,
                clue_text: mysteryBag.clue_text,
                reward_text: mysteryBag.reward_text,
                reward_file: mysteryBag.reward_file,
                action: status
            }
        );
    } catch (err) {
        next(err);
    }
};

const getUserMysteryBags = async (req, res, next) => {
    try {
        const userBags = await MysteryBagModel.find({ 
            created_by: new ObjectId(req.user.id),
            status: 'active'
        }).sort({ created_at: -1 });
        
        return apiResponse.successResponseWithData(
            res,
            "User mystery bags retrieved",
            userBags
        );
    } catch (err) {
        next(err);
    }
};

const editMysteryBag = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { ...bagDetails } = req.body;
        
        // Check if bag exists and user owns it
        const existingBag = await MysteryBagModel.findOne({ 
            _id: new ObjectId(id),
            created_by: new ObjectId(req.user.id)
        });
        
        if (!existingBag) {
            return apiResponse.notFoundResponse(res, "Mystery bag not found or unauthorized!");
        }
        
        // Update location if provided
        if (req.body.latitude && req.body.longitude) {
            bagDetails.location = { 
                type: 'Point', 
                coordinates: [req.body.latitude, req.body.longitude] 
            };
        }
        
        // Update reward file if new one uploaded
        if (req.files && req.files['reward_file']) {
            bagDetails.reward_file = req.files['reward_file'][0].location;
        }
        
        const updatedBag = await MysteryBagModel.findByIdAndUpdate(
            id,
            bagDetails,
            { new: true }
        );
        
        return apiResponse.successResponseWithData(
            res,
            "Mystery bag updated successfully",
            updatedBag
        );
    } catch (err) {
        next(err);
    }
};

const getAllMysteryBags = async (req, res, next) => {
    try {
        
        const mysteryBags = await MysteryBagModel.find({ status: 'active' })
            .sort({ created_at: -1 })
            
        const total = await MysteryBagModel.countDocuments({ status: 'active' });
        
        return apiResponse.successResponseWithData(
            res,
            "Mystery bags retrieved successfully",
            {
                bags: mysteryBags,
            }
        );
    } catch (err) {
        next(err);
    }
};

const deleteMysteryBag = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Check if bag exists and user owns it
        const existingBag = await MysteryBagModel.findOne({ 
            _id: new ObjectId(id),
            created_by: new ObjectId(req.user.id)
        });
        
        if (!existingBag) {
            return apiResponse.notFoundResponse(res, "Mystery bag not found or unauthorized!");
        }
        
        // Check if any users have interacted with this bag
        const interactions = await UserMysteryBagModel.find({ 
            mystery_bag_id: new ObjectId(id) 
        });
        
        if (interactions.length > 0) {
            return apiResponse.ErrorResponse(
                res,
                "Cannot delete mystery bag that has been interacted with by users"
            );
        }
        
        // Soft delete by updating status
        await MysteryBagModel.findByIdAndUpdate(
            id,
            { status: 'deleted' },
            { new: true }
        );
        
        return apiResponse.successResponse(
            res,
            "Mystery bag deleted successfully"
        );
    } catch (err) {
        next(err);
    }
};

const getSingleMysteryBag = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        const mysteryBag = await MysteryBagModel.findOne({ 
            _id: new ObjectId(id),
            status: 'active'
        }).populate('created_by', 'username');
        
        if (!mysteryBag) {
            return apiResponse.notFoundResponse(res, "Mystery bag not found!");
        }
        
        // Check if current user has interacted with this bag
        const userInteraction = await UserMysteryBagModel.findOne({ 
            mystery_bag_id: new ObjectId(id), 
            user_id: new ObjectId(req.user.id) 
        });
        
        const bagData = {
            id: mysteryBag._id,
            bag_title: mysteryBag.bag_title,
            bag_description: mysteryBag.bag_description,
            clue_text: mysteryBag.clue_text,
            reward_text: mysteryBag.reward_text,
            reward_file: mysteryBag.reward_file,
            bag_type: mysteryBag.bag_type,
            location: mysteryBag.location,
            visibility_radius: mysteryBag.visibility_radius,
            created_by: mysteryBag.created_by?.username,
            created_at: mysteryBag.created_at,
            interaction_status: userInteraction ? userInteraction.status : null,
            can_interact: !userInteraction
        }; 
        
        return apiResponse.successResponseWithData(
            res,
            "Mystery bag retrieved successfully",
            bagData
        );
    } catch (err) {
        next(err);
    }
};

const getUserCollectedMysteryBags = async (req, res, next) => { 
    try {
        const status = req.params.status; // 'viewed', 'collected', or 'all'
        
        let query = { user_id: new ObjectId(req.user.id) };
        
        if (status !== 'all') {
            query.status = status;
        }
        
        const userInteractions = await UserMysteryBagModel.find(query)
            .populate({
                path: 'mystery_bag_id',
                populate: {
                    path: 'created_by',
                    select: 'username'
                }
            })
            .sort({ created_at: -1 });
        
        if (userInteractions.length === 0) {
            return apiResponse.ErrorResponse(
                res,
                `No ${status === 'all' ? '' : status} mystery bags found`
            );
        }
        
        const formattedData = userInteractions.map(interaction => ({
            interaction_id: interaction._id,
            interaction_status: interaction.status,
            interaction_date: interaction.created_at,
            mystery_bag: {
                id: interaction.mystery_bag_id._id,
                bag_title: interaction.mystery_bag_id.bag_title,
                bag_description: interaction.mystery_bag_id.bag_description,
                clue_text: interaction.mystery_bag_id.clue_text,
                reward_text: interaction.mystery_bag_id.reward_text,
                reward_file: interaction.mystery_bag_id.reward_file,
                bag_type: interaction.mystery_bag_id.bag_type,
                location: interaction.mystery_bag_id.location,
                created_by: interaction.mystery_bag_id.created_by?.username,
                created_at: interaction.mystery_bag_id.created_at
            }
        }));
        
        return apiResponse.successResponseWithData(
            res,
            `User ${status === 'all' ? 'interacted' : status} mystery bags retrieved`,
            formattedData
        );
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createMysteryBag,
    getNearbyMysteryBags,
    interactWithMysteryBag,
    getUserMysteryBags,
    editMysteryBag,
    getAllMysteryBags,
    deleteMysteryBag,
    getSingleMysteryBag,
    getUserCollectedMysteryBags
};
