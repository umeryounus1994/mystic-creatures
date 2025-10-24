const MysteryBagModel = require("../models/mysterybag.model");
const UserMysteryBagModel = require("../models/usermysterybag.model");
const apiResponse = require("../../../helpers/apiResponse");
const { ObjectId } = require('mongodb');
const mysteryBagHelper = require("../../../helpers/mysterybag");
const MysteryBagQuizModel = require("../models/mysterybagquiz.model");

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
        var questions = [];
        if (req.body.questions) {
            try {
                questions = JSON.parse(req.body.questions);
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
        const user_answer = req.body.user_answer;
        
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
        
        const updatedBag = await MysteryBagModel.findByIdAndUpdate(
            id,
            bagDetails,
            { new: true }
        );
        
        // Handle quiz questions if provided
        if (req.body.questions) {
            var questions = JSON.parse(req.body.questions);
            
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
        const mysteryBags = await MysteryBagModel.find({ status: 'active' })
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
