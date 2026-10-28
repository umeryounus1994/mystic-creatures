const MysteryBagModel = require("../models/mysterybag.model");
const UserMysteryBagModel = require("../models/usermysterybag.model");
const apiResponse = require("../../../helpers/apiResponse");
const { ObjectId } = require('mongodb');
const mysteryBagHelper = require("../../../helpers/mysterybag");
const MysteryBagQuizModel = require("../models/mysterybagquiz.model");
const {
  applyViewOnlyBagFields,
  getActiveBagFilter,
  isViewOnlyBagExpired,
} = require("../../../utils/viewOnlyBag");

const parseCollectibleFlag = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (value === false || value === 0 || value === "0") {
        return false;
    }
    const normalized = String(value).toLowerCase();
    if (["false", "no", "view-only", "view_only", "watch"].includes(normalized)) {
        return false;
    }
    if (value === true || value === 1 || value === "1") {
        return true;
    }
    if (["true", "yes", "collectible", "collect"].includes(normalized)) {
        return true;
    }
    return null;
};

const createMysteryBag = async (req, res, next) => {
    try {
        const { ...bagDetails } = req.body;
        
        var location = { 
            type: 'Point', 
            coordinates: [req.body?.latitude, req.body?.longitude] 
        };
        
        bagDetails.location = location;
        bagDetails.reward_file = req.files['reward_file'] ? req.files['reward_file'][0].location : "";
        bagDetails.drawing_file = req.files['drawing_file'] ? req.files['drawing_file'][0].location : "";
        bagDetails.created_by = req.user.id;

        // Accept is_collectible (Unity) and map to bag_type collectible | view-only
        const collectibleFlag = parseCollectibleFlag(
            req.body.is_collectible ?? req.body.isCollectible
        );
        if (collectibleFlag === false) {
            bagDetails.bag_type = "view-only";
        } else if (collectibleFlag === true) {
            bagDetails.bag_type = "collectible";
        } else if (!bagDetails.bag_type) {
            bagDetails.bag_type = "collectible";
        }

        applyViewOnlyBagFields(bagDetails);
        var questions = [];
        if (req.body.questions) {
            try {
                if (typeof req.body.questions === 'string') {
                    questions = JSON.parse(req.body.questions);
                } else if (Array.isArray(req.body.questions)) {
                    questions = req.body.questions;
                } else {
                    questions = [];
                }
                if (!Array.isArray(questions)) {
                    questions = [];
                }
            } catch (parseError) {
                questions = [];
            }
        }
        
        const createdBag = new MysteryBagModel(bagDetails);
        
        createdBag.save(async (err) => {
            if (err) {
                return apiResponse.ErrorResponse(
                    res,
                    "System went wrong, Kindly try again later"
                );
            }
            
            const quizes = [];
            
            questions.forEach(question => {
                let d = {
                    answer: question.answer,
                    correct_option: question?.correct_option === true || question?.correct_option === 'true',
                    mystery_bag_id: createdBag?._id 
                }
                quizes.push(d);
            });
            
            if (quizes.length > 0) {
                MysteryBagQuizModel.insertMany(quizes)
                    .then(function () {
                        return apiResponse.successResponseWithDataClues(
                            res,
                            "Mystery bag created successfully",
                            createdBag,
                            questions
                        );
                    });
            } else {
                return apiResponse.successResponseWithData(
                    res,
                    "Mystery bag created successfully",
                    createdBag
                );
            }
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
        
        const mysteryBags = await MysteryBagModel.find(getActiveBagFilter())
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
        const user_answer = req.body.user_answer;
        
        const mysteryBag = await MysteryBagModel.findOne({ _id: new ObjectId(id), ...getActiveBagFilter() });
        if (!mysteryBag) {
            return apiResponse.notFoundResponse(res, "Mystery bag not found!");
        }

        if (isViewOnlyBagExpired(mysteryBag)) {
            return apiResponse.notFoundResponse(res, "Mystery bag has expired");
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
        
        let status = action === "collect" ? "collected" : "viewed";
        let responseMessage = `Mystery bag ${status} successfully`;
        let isCorrect = null;
        
        // Check answer if provided
        if (user_answer) {
            const correctOption = await MysteryBagQuizModel.findOne({  
                mystery_bag_id: new ObjectId(id), 
                correct_option: true 
            });
            
            if (correctOption && correctOption._id.toString() === user_answer) {
                status = "collected";
                responseMessage = "Correct answer! Mystery bag collected successfully";
                isCorrect = true;
            } else {
                status = "viewed";
                responseMessage = "Wrong answer! You cannot attempt this mystery bag again";
                isCorrect = false;
            }
        }
        
        const userInteraction = new UserMysteryBagModel({
            mystery_bag_id: id,
            user_id: req.user.id,
            status: status,
            submitted_answer: user_answer || null,
            is_correct: isCorrect
        });
        
        await userInteraction.save();
        
        return apiResponse.successResponseWithData(
            res,
            responseMessage,
            {
                bag_title: mysteryBag.bag_title,
                drawing_file: mysteryBag.drawing_file,
                reward_file: mysteryBag.reward_file,
                action: status,
                is_correct: isCorrect
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
        
        // Add quiz questions to each bag
        const bagsWithQuiz = await Promise.all(userBags.map(async (bag) => {
            const quizQuestions = await MysteryBagQuizModel.find({ 
                mystery_bag_id: new ObjectId(bag._id) 
            });
            
            return {
                ...bag.toObject(),
                clues: quizQuestions
            };
        }));
        
        return apiResponse.successResponseWithData(
            res,
            "User mystery bags retrieved",
            bagsWithQuiz
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
        
        // Update files if new ones uploaded
        if (req.files && req.files['reward_file']) { 
            bagDetails.reward_file = req.files['reward_file'][0].location;
        }
        if (req.files && req.files['drawing_file']) {
            bagDetails.drawing_file = req.files['drawing_file'][0].location;
        }

        const collectibleFlag = parseCollectibleFlag(
            req.body.is_collectible ?? req.body.isCollectible
        );
        if (collectibleFlag === false) {
            bagDetails.bag_type = "view-only";
        } else if (collectibleFlag === true) {
            bagDetails.bag_type = "collectible";
        }
        
        if (req.body.bag_type !== undefined || bagDetails.bag_type !== undefined) {
            applyViewOnlyBagFields(bagDetails);
        }
        
        const updatedBag = await MysteryBagModel.findByIdAndUpdate(
            id,
            bagDetails,
            { new: true }
        );
        
        // Handle quiz questions if provided (optional)
        if (req.body.questions) {
            var questions = [];
            try {
                if (typeof req.body.questions === 'string') {
                    questions = JSON.parse(req.body.questions);
                } else if (Array.isArray(req.body.questions)) {
                    questions = req.body.questions;
                }
                if (!Array.isArray(questions)) {
                    questions = [];
                }
            } catch (parseError) {
                questions = [];
            }

            // Delete existing quiz questions
            await MysteryBagQuizModel.deleteMany({mystery_bag_id: new ObjectId(id)});
            
            const quizes = [];
            
            questions.forEach(question => {
                let d = {
                    answer: question.answer,
                    correct_option: question?.correct_option === true || question?.correct_option === 'true',
                    mystery_bag_id: id
                }
                quizes.push(d);
            });
            
            if (quizes.length > 0) {
                await MysteryBagQuizModel.insertMany(quizes);
            }
        }
        
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
        const mysteryBags = await MysteryBagModel.find(getActiveBagFilter())
            .sort({ created_at: -1 });
            
        // Add quiz questions to each bag
        const bagsWithQuiz = await Promise.all(mysteryBags.map(async (bag) => {
            const quizQuestions = await MysteryBagQuizModel.find({ 
                mystery_bag_id: new ObjectId(bag._id) 
            });
            
            return {
                ...bag.toObject(),
                quiz: quizQuestions
            };
        }));
        
        return apiResponse.successResponseWithData(
            res,
            "Mystery bags retrieved successfully",
            {
                bags: bagsWithQuiz,
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
            ...getActiveBagFilter(),
        }).populate('created_by', 'username');
        
        if (!mysteryBag) {
            return apiResponse.notFoundResponse(res, "Mystery bag not found!");
        }
        
        if (isViewOnlyBagExpired(mysteryBag)) {
            return apiResponse.notFoundResponse(res, "Mystery bag has expired");
        }
        
        // Check if current user has interacted with this bag
        const userInteraction = await UserMysteryBagModel.findOne({ 
            mystery_bag_id: new ObjectId(id), 
            user_id: new ObjectId(req.user.id) 
        });
        
        // Get quiz questions
        const quizQuestions = await MysteryBagQuizModel.find({ 
            mystery_bag_id: new ObjectId(id) 
        });
        
        const bagData = {
            id: mysteryBag._id,
            bag_title: mysteryBag.bag_title,
            bag_description: mysteryBag.bag_description,
            drawing_file: mysteryBag.drawing_file,
            reward_file: mysteryBag.reward_file,
            bag_type: mysteryBag.bag_type,
            expires_at: mysteryBag.expires_at,
            location: mysteryBag.location,
            visibility_radius: mysteryBag.visibility_radius,
            created_by: mysteryBag.created_by?.username,
            created_at: mysteryBag.created_at,
            interaction_status: userInteraction ? userInteraction.status : null,
            can_interact: !userInteraction,
            clues: quizQuestions
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
        const status = req.params.status;
        
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
        
        const formattedData = await Promise.all(userInteractions.map(async (interaction) => {
            // Get quiz questions for each mystery bag
            const quizQuestions = await MysteryBagQuizModel.find({ 
                mystery_bag_id: new ObjectId(interaction.mystery_bag_id._id) 
            });
            
            return {
                interaction_id: interaction._id,
                interaction_status: interaction.status,
                interaction_date: interaction.created_at,
                mystery_bag: {
                    id: interaction.mystery_bag_id._id,
                    bag_title: interaction.mystery_bag_id.bag_title,
                    bag_description: interaction.mystery_bag_id.bag_description,
                    drawing_file: interaction.mystery_bag_id.drawing_file,
                    reward_file: interaction.mystery_bag_id.reward_file,
                    bag_type: interaction.mystery_bag_id.bag_type,
                    location: interaction.mystery_bag_id.location,
                    created_by: interaction.mystery_bag_id.created_by?.username,
                    created_at: interaction.mystery_bag_id.created_at,
                    quiz: quizQuestions
                }
            };
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

/**
 * MCU-7 — Classify player map content for admin moderation.
 * Magic Art = mystery bag with a drawing_file; old map bags have no drawing.
 */
const resolvePlayerContentType = (bag) => {
    const hasDrawing = !!(bag.drawing_file && String(bag.drawing_file).trim());
    if (hasDrawing) {
        return bag.bag_type === "view-only" ? "magic_art_view" : "magic_art_collect";
    }
    return "map_bag_old";
};

/**
 * Admin: list all player-created map content (active mystery bags), newest first.
 * Includes Magic Art (view/collect) and legacy map bags.
 */
const getPlayerMapContent = async (req, res, next) => {
    try {
        const search = (req.query.search || req.query.username || "").toString().trim();

        const bags = await MysteryBagModel.find({ status: "active" })
            .populate("created_by", "username user_type email")
            .sort({ created_at: -1 })
            .lean();

        const bagIds = bags.map((bag) => bag._id);
        const collectedCounts = await UserMysteryBagModel.aggregate([
            {
                $match: {
                    mystery_bag_id: { $in: bagIds },
                    status: "collected",
                },
            },
            {
                $group: {
                    _id: "$mystery_bag_id",
                    count: { $sum: 1 },
                },
            },
        ]);
        const collectedMap = {};
        collectedCounts.forEach((row) => {
            collectedMap[String(row._id)] = row.count;
        });

        let items = bags.map((bag) => {
            const coords = bag.location?.coordinates || [];
            // App stores coordinates as [latitude, longitude]
            const latitude = coords.length > 0 ? coords[0] : null;
            const longitude = coords.length > 1 ? coords[1] : null;
            const contentType = resolvePlayerContentType(bag);

            return {
                id: String(bag._id),
                _id: bag._id,
                preview_url: bag.drawing_file || bag.reward_file || "",
                drawing_file: bag.drawing_file || "",
                reward_file: bag.reward_file || "",
                content_type: contentType,
                bag_type: bag.bag_type || "collectible",
                bag_title: bag.bag_title || "",
                bag_description: bag.bag_description || "",
                created_by: {
                    id: bag.created_by?._id ? String(bag.created_by._id) : null,
                    username: bag.created_by?.username || "",
                    user_type: bag.created_by?.user_type || "",
                },
                created_at: bag.created_at,
                location: {
                    latitude,
                    longitude,
                },
                collected_count: collectedMap[String(bag._id)] || 0,
            };
        });

        if (search) {
            const q = search.toLowerCase();
            items = items.filter((item) =>
                (item.created_by?.username || "").toLowerCase().includes(q)
            );
        }

        return apiResponse.successResponseWithData(
            res,
            "Player map content retrieved successfully",
            {
                items,
                total: items.length,
            }
        );
    } catch (err) {
        next(err);
    }
};

/**
 * Admin: permanently remove player map content from the map and all galleries.
 * Soft-deletes the bag and removes all user interactions (gallery entries).
 */
const adminDeletePlayerMapContent = async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            return apiResponse.ErrorResponse(res, "Invalid content id");
        }

        const existingBag = await MysteryBagModel.findOne({
            _id: new ObjectId(id),
            status: "active",
        });

        if (!existingBag) {
            return apiResponse.notFoundResponse(
                res,
                "Player map content not found!"
            );
        }

        await MysteryBagModel.findByIdAndUpdate(
            id,
            { status: "deleted" },
            { new: true }
        );

        // Remove from every player's gallery / interaction history
        await UserMysteryBagModel.deleteMany({
            mystery_bag_id: new ObjectId(id),
        });

        // Clean up quiz options tied to this bag
        await MysteryBagQuizModel.deleteMany({
            mystery_bag_id: new ObjectId(id),
        });

        return apiResponse.successResponse(
            res,
            "Player map content deleted successfully"
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
    getUserCollectedMysteryBags,
    getPlayerMapContent,
    adminDeletePlayerMapContent,
};
