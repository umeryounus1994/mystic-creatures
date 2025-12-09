const ModelBagModel = require("../models/modelbag.model");
const UserModelBagModel = require("../models/usermodelbag.model");
const apiResponse = require("../../../helpers/apiResponse");
const { ObjectId } = require('mongodb');
const ModelBagQuizModel = require("../models/modelbagquiz.model");
const haversine = require('haversine');

const createModelBag = async (req, res, next) => {
    try {
        const { ...bagDetails } = req.body;
        
        var location = { 
            type: 'Point', 
            coordinates: [req.body?.latitude, req.body?.longitude] 
        };
        
        bagDetails.location = location;
        bagDetails.reward_file = req.files && req.files['reward_file'] && req.files['reward_file'][0] ? req.files['reward_file'][0].location : "";
        bagDetails.created_by = req.user.id;
        
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
        
        const createdBag = new ModelBagModel(bagDetails);
        
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
                    model_bag_id: createdBag?._id 
                }
                quizes.push(d);
            });
            
            if (quizes.length > 0) {
                ModelBagQuizModel.insertMany(quizes)
                    .then(function () {
                        return apiResponse.successResponseWithData(
                            res,
                            "Model bag created successfully",
                            createdBag
                        );
                    });
            } else {
                return apiResponse.successResponseWithData(
                    res,
                    "Model bag created successfully",
                    createdBag
                );
            }
        });
    } catch (err) {
        next(err);
    }
};

const getNearbyModelBags = async (req, res, next) => {
    try {
        if (req.body.latitude == undefined || req.body.longitude == undefined) {
            return apiResponse.ErrorResponse(
                res,
                "Lat, Long is required"
            );
        }
        
        const latitude = req.body.latitude;
        const longitude = req.body.longitude;
        
        const modelBags = await ModelBagModel.find({status: 'active'})
            .sort({ created_at: -1 })
            .populate('created_by', 'username');
        
        // Filter by distance using haversine (same as mysterybag)
        const nearbyBags = modelBags.filter(bag => {
            if (!bag.location || !bag.location.coordinates) return false;
            
            let endLocation = {
                latitude: bag.location.coordinates[0],
                longitude: bag.location.coordinates[1]
            };
            
            const userLocation = {
                latitude: latitude,
                longitude: longitude
            };
            
            const locationDistance = haversine(userLocation, endLocation, { unit: 'km' });
            
            return locationDistance <= (bag.visibility_radius || 70);
        });
        
        // Add quiz questions and user interaction status to each bag
        const bagsWithQuiz = await Promise.all(nearbyBags.map(async (bag) => {
            // Get quiz questions for this bag
            const quizQuestions = await ModelBagQuizModel.find({ 
                model_bag_id: new ObjectId(bag._id) 
            });
            
            // Check if user already interacted
            const userInteraction = await UserModelBagModel.findOne({ 
                model_bag_id: new ObjectId(bag._id),
                user_id: new ObjectId(req.user.id) 
            });
            
            // Calculate distance
            let endLocation = {
                latitude: bag.location.coordinates[0],
                longitude: bag.location.coordinates[1]
            };
            const userLocation = {
                latitude: latitude,
                longitude: longitude
            };
            const locationDistance = haversine(userLocation, endLocation, { unit: 'km' });
            
            return {
                ...bag.toObject(),
                clues: quizQuestions,
                interaction_status: userInteraction ? userInteraction.status : null,
                can_interact: !userInteraction,
                distance: locationDistance
            };
        }));
        
        return res.json({
            status: bagsWithQuiz.length > 0 ? true : false,
            message: bagsWithQuiz.length > 0 ? "Data Found" : "No model bags found",
            data: bagsWithQuiz
        });
    } catch (err) {
        next(err);
    }
};

const interactWithModelBag = async (req, res, next) => {
    try {
        const id = req.params.id;
        const action = req.body.action; // 'view' or 'collect'
        const user_answer = req.body.user_answer;
        
        const modelBag = await ModelBagModel.findOne({ _id: new ObjectId(id) });
        if (!modelBag) {
            return apiResponse.notFoundResponse(res, "Model bag not found!");
        }
        
        // Check if user already interacted
        const existingInteraction = await UserModelBagModel.findOne({ 
            user_id: new ObjectId(req.user.id), 
            model_bag_id: new ObjectId(id) 
        });
        
        if (existingInteraction) {
            return apiResponse.ErrorResponse(res, "Already interacted with this model bag");
        }
        
        // Validate action based on bag type
        if (modelBag.bag_type === "view-only" && action === "collect") {
            return apiResponse.ErrorResponse(res, "This model bag is view-only");
        }
        
        let status = action === "collect" ? "collected" : "viewed";
        let responseMessage = `Model bag ${status} successfully`;
        let isCorrect = null;
        
        // Check answer if provided
        if (user_answer) {
            const correctOption = await ModelBagQuizModel.findOne({  
                model_bag_id: new ObjectId(id), 
                correct_option: true 
            });
            
            if (correctOption && correctOption._id.toString() === user_answer) {
                status = "collected";
                responseMessage = "Correct answer! Model bag collected successfully";
                isCorrect = true;
            } else {
                status = "viewed";
                responseMessage = "Wrong answer! You cannot attempt this model bag again";
                isCorrect = false;
            }
        }
        
        const userInteraction = new UserModelBagModel({
            model_bag_id: id,
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
                title: modelBag.title,
                model_number: modelBag.model_number,
                reward_file: modelBag.reward_file,
                bag_type: modelBag.bag_type,
                action: status,
                is_correct: isCorrect
            }
        );
    } catch (err) {
        next(err);
    }
};

const getUserModelBags = async (req, res, next) => {
    try {
        const userBags = await ModelBagModel.find({ 
            created_by: new ObjectId(req.user.id),
            status: 'active'
        }).sort({ created_at: -1 });
        
        // Add quiz questions to each bag
        const bagsWithQuiz = await Promise.all(userBags.map(async (bag) => {
            const quizQuestions = await ModelBagQuizModel.find({ 
                model_bag_id: new ObjectId(bag._id) 
            });
            
            return {
                ...bag.toObject(),
                clues: quizQuestions
            };
        }));
        
        return apiResponse.successResponseWithData(
            res,
            "User model bags retrieved",
            bagsWithQuiz
        );
    } catch (err) {
        next(err);
    }
};

const editModelBag = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { ...bagDetails } = req.body;
        
        // Check if bag exists and user owns it
        const existingBag = await ModelBagModel.findOne({ 
            _id: new ObjectId(id),
            created_by: new ObjectId(req.user.id)
        });
        
        if (!existingBag) {
            return apiResponse.notFoundResponse(res, "Model bag not found or unauthorized!");
        }
        
        // Update location if provided
        if (req.body.latitude && req.body.longitude) {
            bagDetails.location = { 
                type: 'Point', 
                coordinates: [req.body.latitude, req.body.longitude] 
            };
        }
        
        // Update files if new ones uploaded
        if (req.files && req.files['reward_file'] && req.files['reward_file'][0]) { 
            bagDetails.reward_file = req.files['reward_file'][0].location;
        }
        
        const updatedBag = await ModelBagModel.findByIdAndUpdate(
            id,
            bagDetails,
            { new: true }
        );
        
        // Handle quiz questions if provided
        if (req.body.questions) {
            var questions = [];
            try {
                if (typeof req.body.questions === 'string') {
                    questions = JSON.parse(req.body.questions);
                } else if (Array.isArray(req.body.questions)) {
                    questions = req.body.questions;
                }
            } catch (parseError) {
                questions = [];
            }
            
            // Delete existing quiz questions
            await ModelBagQuizModel.deleteMany({model_bag_id: new ObjectId(id)});
            
            const quizes = [];
            
            questions.forEach(question => {
                let d = {
                    answer: question.answer,
                    correct_option: question?.correct_option === true || question?.correct_option === 'true',
                    model_bag_id: id
                }
                quizes.push(d);
            });
            
            if (quizes.length > 0) {
                await ModelBagQuizModel.insertMany(quizes);
            }
        }
        
        return apiResponse.successResponseWithData(
            res,
            "Model bag updated successfully",
            updatedBag
        );
    } catch (err) {
        next(err);
    }
};

const getAllModelBags = async (req, res, next) => {
    try {
        const modelBags = await ModelBagModel.find({ status: 'active' })
            .sort({ created_at: -1 });
            
        // Add quiz questions to each bag
        const bagsWithQuiz = await Promise.all(modelBags.map(async (bag) => {
            const quizQuestions = await ModelBagQuizModel.find({ 
                model_bag_id: new ObjectId(bag._id) 
            });
            
            return {
                ...bag.toObject(),
                quiz: quizQuestions
            };
        }));
        
        return apiResponse.successResponseWithData(
            res,
            "Model bags retrieved successfully",
            {
                bags: bagsWithQuiz,
            }
        );
    } catch (err) {
        next(err);
    }
};

const deleteModelBag = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Check if bag exists and user owns it
        const existingBag = await ModelBagModel.findOne({ 
            _id: new ObjectId(id),
            created_by: new ObjectId(req.user.id)
        });
        
        if (!existingBag) {
            return apiResponse.notFoundResponse(res, "Model bag not found or unauthorized!");
        }
        
        // Check if any users have interacted with this bag
        const interactions = await UserModelBagModel.find({ 
            model_bag_id: new ObjectId(id) 
        });
        
        if (interactions.length > 0) {
            return apiResponse.ErrorResponse(
                res,
                "Cannot delete model bag that has been interacted with by users"
            );
        }
        
        // Soft delete by updating status
        await ModelBagModel.findByIdAndUpdate(
            id,
            { status: 'deleted' },
            { new: true }
        );
        
        return apiResponse.successResponse(
            res,
            "Model bag deleted successfully"
        );
    } catch (err) {
        next(err);
    }
};

const getSingleModelBag = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        const modelBag = await ModelBagModel.findOne({ 
            _id: new ObjectId(id),
            status: 'active'
        }).populate('created_by', 'username');
        
        if (!modelBag) {
            return apiResponse.notFoundResponse(res, "Model bag not found!");
        }
        
        // Check if current user has interacted with this bag
        const userInteraction = await UserModelBagModel.findOne({ 
            model_bag_id: new ObjectId(id), 
            user_id: new ObjectId(req.user.id) 
        });
        
        // Get quiz questions
        const quizQuestions = await ModelBagQuizModel.find({ 
            model_bag_id: new ObjectId(id) 
        });
        
        const bagData = {
            id: modelBag._id,
            title: modelBag.title,
            model_number: modelBag.model_number,
            reward_file: modelBag.reward_file,
            bag_type: modelBag.bag_type,
            location: modelBag.location,
            visibility_radius: modelBag.visibility_radius,
            created_by: modelBag.created_by?.username,
            created_at: modelBag.created_at,
            interaction_status: userInteraction ? userInteraction.status : null,
            can_interact: !userInteraction,
            clues: quizQuestions
        }; 
        
        return apiResponse.successResponseWithData(
            res,
            "Model bag retrieved successfully",
            bagData
        );
    } catch (err) {
        next(err);
    }
};

const getUserCollectedModelBags = async (req, res, next) => { 
    try {
        const status = req.params.status;
        
        let query = { user_id: new ObjectId(req.user.id) };
        
        if (status !== 'all') {
            query.status = status;
        }
        
        const userInteractions = await UserModelBagModel.find(query)
            .populate({
                path: 'model_bag_id',
                populate: {
                    path: 'created_by',
                    select: 'username'
                }
            })
            .sort({ created_at: -1 });
        
        if (userInteractions.length === 0) {
            return apiResponse.ErrorResponse(
                res,
                `No ${status === 'all' ? '' : status} model bags found`
            );
        }
        
        const formattedData = await Promise.all(userInteractions.map(async (interaction) => {
            // Get quiz questions for each model bag
            const quizQuestions = await ModelBagQuizModel.find({ 
                model_bag_id: new ObjectId(interaction.model_bag_id._id) 
            });
            
            return {
                interaction_id: interaction._id,
                interaction_status: interaction.status,
                interaction_date: interaction.created_at,
                model_bag: {
                    id: interaction.model_bag_id._id,
                    title: interaction.model_bag_id.title,
                    model_number: interaction.model_bag_id.model_number,
                    reward_file: interaction.model_bag_id.reward_file,
                    location: interaction.model_bag_id.location,
                    created_by: interaction.model_bag_id.created_by?.username,
                    created_at: interaction.model_bag_id.created_at,
                    quiz: quizQuestions
                }
            };
        }));
        
        return apiResponse.successResponseWithData(
            res,
            `User ${status === 'all' ? 'interacted' : status} model bags retrieved`,
            formattedData
        );
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createModelBag,
    getNearbyModelBags,
    interactWithModelBag,
    getUserModelBags,
    editModelBag,
    getAllModelBags,
    deleteModelBag,
    getSingleModelBag,
    getUserCollectedModelBags
};
