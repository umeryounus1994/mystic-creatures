const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const haversine = require('haversine');
const TreasureHuntQuizModel = require("../src/v1/models/treasurequiz.model");
const TreasureHuntQuizOptionModel = require("../src/v1/models/treasurequizoption.model");
const UserTreasureHuntModel = require("../src/v1/models/usertreasurehunt.model");
const HuntPurchaseModel = require("../src/v1/models/huntpurchases.model");

module.exports.getAllTreasureHunt = async function (data, user_id, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    let endLocation = {
                        latitude: element.hunt_location.coordinates[0],
                        longitude: element.hunt_location.coordinates[1]
                    }
                    const userLocation = {
                        latitude: latitude,
                        longitude: longitude
                    }
                    const locationDistance = haversine(userLocation, endLocation, { unit: 'km' })
                    if (locationDistance < 10) {
                        var findTreasureHuntQuiz = await TreasureHuntQuizModel.find({ treasure_hunt_id: new ObjectID(element._id) })
                            .populate([
                                {
                                    path: 'mythica', select: {
                                        creature_name: 1, creature_element: 1, creature_rarity: 1,
                                        creature_weight: 1, creature_height: 1, creature_id: 1
                                    }
                                }])
                        var quizPromises = findTreasureHuntQuiz.map(async (quiz) => {
                            var options = await TreasureHuntQuizOptionModel.find({ treasure_hunt_quiz_id: new ObjectID(quiz._id), treasure_hunt_id: new ObjectID(element?._id) });
                            var simplifiedOptions = options.map(option => ({
                                _id: option.id,
                                answer: option.answer,
                                correct_option: option.correct_option
                            }));
                            return {
                                ...quiz.toObject(), // Convert Mongoose document to plain JavaScript object
                                options: simplifiedOptions
                            };
                        });
                        var quizzesWithOptions = await Promise.all(quizPromises);
                        const filteredArray = quizzesWithOptions.filter(element => element != null);
                        const userHunt = await UserTreasureHuntModel.findOne({ treasure_hunt_id: new ObjectID(element?._id), user_id: new ObjectID(user_id) });
                        const checkProgress = await checkQuizStatus(element?._id, user_id)
                        const userPurchaseHunt = await HuntPurchaseModel.findOne({ user_id: new ObjectID(user_id), hunt_id: new ObjectID(element?._id) });
                        var el = {
                            id: element._id,
                            treasure_hunt_title: element.treasure_hunt_title,
                            no_of_xp: element.no_of_xp,
                            no_of_crypes: element.no_of_crypes,
                            level_increase: element.level_increase,
                            reward_file: element.reward_file,
                            mythica: element.mythica_ID?.creature_name,
                            mythica_ID: element.mythica_ID?.creature_id,
                            status: element.status,
                            premium_hunt: element?.premium_hunt,
                            hunt_package: element?.hunt_package,
                            treasure_hunt_image: element.treasure_hunt_image,
                            quiz: filteredArray.length > 0 ? quizzesWithOptions : [],
                            treasure_hunt_status: userHunt ? userHunt?.status : (userPurchaseHunt ? 'purchased' : 'open'),
                            hunt_progress: checkProgress?.answered,
                            hunt_purchase: userPurchaseHunt ? true : false

                        }

                        result.push(el)
                    }

                    resolvve(result);
                })
            )
        })
        return Promise.all(promiseArr).then(ress => {
            resolve(result.sort((a, b) => moment(b.created_at, 'DD-MM-YYYY').diff(moment(a.created_at, 'DD-MM-YYYY'))))
        })
    })
}

module.exports.getAllAdminTreasureHunt = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findTreasureHuntQuiz = await TreasureHuntQuizModel.find({ treasure_hunt_id: new ObjectID(element._id) })
                        .populate([
                            {
                                path: 'mythica', select: {
                                    creature_name: 1, creature_element: 1, creature_rarity: 1,
                                    creature_weight: 1, creature_height: 1, creature_id: 1
                                }
                            }])
                    var quizPromises = findTreasureHuntQuiz.map(async (quiz) => {
                        var options = await TreasureHuntQuizOptionModel.find({ treasure_hunt_quiz_id: new ObjectID(quiz._id), treasure_hunt_id: new ObjectID(element?._id) });
                        var simplifiedOptions = options.map(option => ({
                            _id: option.id,
                            answer: option.answer,
                            correct_option: option.correct_option
                        }));
                        return {
                            ...quiz.toObject(), // Convert Mongoose document to plain JavaScript object
                            options: simplifiedOptions
                        };
                    });
                    var quizzesWithOptions = await Promise.all(quizPromises);
                    const filteredArray = quizzesWithOptions.filter(element => element != null);

                    var el = {
                        id: element._id,
                        treasure_hunt_title: element.treasure_hunt_title,
                        no_of_xp: element.no_of_xp,
                        no_of_crypes: element.no_of_crypes,
                        level_increase: element.level_increase,
                        reward_file: element.reward_file,
                        premium_hunt: element?.premium_hunt,
                        hunt_package: element?.hunt_package,
                        mythica: element.mythica_ID?.creature_name,
                        mythica_ID: element.mythica_ID?.creature_id,
                        status: element.status,
                        treasure_hunt_image: element.treasure_hunt_image,
                        quiz: filteredArray.length > 0 ? quizzesWithOptions : []

                    }

                    result.push(el)
                    resolvve(result);
                })
            )
        })
        return Promise.all(promiseArr).then(ress => {
            resolve(result.sort((a, b) => moment(b.created_at, 'DD-MM-YYYY').diff(moment(a.created_at, 'DD-MM-YYYY'))))
        })
    })
}

module.exports.getSingleHunt = async function (data, latitude, longitude) {
    var findTreasureHuntQuiz = await TreasureHuntQuizModel.find({ treasure_hunt_id: new ObjectID(data._id) })
        .populate([
            {
                path: 'mythica', select: {
                    creature_name: 1, creature_element: 1, creature_rarity: 1,
                    creature_weight: 1, creature_height: 1, creature_id: 1
                }
            }])
    var quizPromises = findTreasureHuntQuiz.map(async (quiz) => {

        var options = await TreasureHuntQuizOptionModel.find({ treasure_hunt_quiz_id: new ObjectID(quiz._id), treasure_hunt_id: new ObjectID(data?._id) });
        var simplifiedOptions = options.map(option => ({
            _id: option.id,
            answer: option.answer,
            correct_option: option.correct_option
        }));
        return {
            ...quiz.toObject(), // Convert Mongoose document to plain JavaScript object
            options: simplifiedOptions
        };

    });

    var quizzesWithOptions = await Promise.all(quizPromises);
    const filteredArray = quizzesWithOptions.filter(element => element != null);
    var el = {
        id: data._id,
        treasure_hunt_title: data.treasure_hunt_title,
        no_of_xp: data.no_of_xp,
        no_of_crypes: data.no_of_crypes,
        level_increase: data.level_increase,
        premium_hunt: data?.premium_hunt,
        hunt_package: data?.hunt_package,
        reward_file: data?.reward_file,
        mythica: data.mythica_ID?.creature_name,
        mythica_ID: data.mythica_ID?.creature_id,
        status: data.status,
        treasure_hunt_image: data.treasure_hunt_image,
        quiz: filteredArray.length > 0 ? quizzesWithOptions : [],
    }

    return el;

}

module.exports.getAllUserTreasureHunt = async function (data, user_id, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    let endLocation = {
                        latitude: element.treasure_hunt_id?.hunt_location.coordinates[0],
                        longitude: element.treasure_hunt_id?.hunt_location.coordinates[1]
                    }
                    const userLocation = {
                        latitude: latitude,
                        longitude: longitude
                    }
                    const locationDistance = haversine(userLocation, endLocation, { unit: 'km' })
                    if (locationDistance < 10) {
                        var findTreasureHuntQuiz = await TreasureHuntQuizModel.find({ treasure_hunt_id: new ObjectID(element.treasure_hunt_id) })
                            .populate([
                                {
                                    path: 'mythica', select: {
                                        creature_name: 1, creature_element: 1, creature_rarity: 1,
                                        creature_weight: 1, creature_height: 1, creature_id: 1
                                    }
                                }])
                        var quizPromises = findTreasureHuntQuiz.map(async (quiz) => {
                            var options = await TreasureHuntQuizOptionModel.find({ treasure_hunt_quiz_id: new ObjectID(quiz._id), treasure_hunt_id: new ObjectID(element?.treasure_hunt_id) });
                            var simplifiedOptions = options.map(option => ({
                                _id: option.id,
                                answer: option.answer,
                                correct_option: option.correct_option
                            }));
                            return {
                                ...quiz.toObject(), // Convert Mongoose document to plain JavaScript object
                                options: simplifiedOptions
                            };
                        });
                        var quizzesWithOptions = await Promise.all(quizPromises);
                        const checkProgress = await checkQuizStatus(element?.treasure_hunt_id, user_id)
                        const filteredArray = quizzesWithOptions.filter(element => element != null);
                        const userPurchaseHunt = await HuntPurchaseModel.findOne({ user_id: new ObjectID(user_id), hunt_id: new ObjectID(element?.treasure_hunt_id) });
                        var el = {
                            id: element.treasure_hunt_id._id,
                            treasure_hunt_title: element?.treasure_hunt_id?.treasure_hunt_title,
                            no_of_xp: element?.treasure_hunt_id.no_of_xp,
                            no_of_crypes: element?.treasure_hunt_id.no_of_crypes,
                            level_increase: element?.treasure_hunt_id.level_increase,
                            reward_file: element?.treasure_hunt_id.reward_file,
                            mythica: element?.treasure_hunt_id.mythica_ID?.creature_name,
                            mythica_ID: element?.treasure_hunt_id.mythica_ID?.creature_id,
                            status: element.status,
                            premium_hunt: element?.treasure_hunt_id.premium_hunt,
                            hunt_package: element?.treasure_hunt_id.hunt_package,
                            treasure_hunt_image: element?.treasure_hunt_id.treasure_hunt_image,
                            quiz: filteredArray.length > 0 ? quizzesWithOptions : [],
                            hunt_progress: checkProgress?.answered,
                            hunt_purchase: userPurchaseHunt ? true : false
                        }

                        result.push(el)
                    }

                    resolvve(result);
                })
            )
        })
        return Promise.all(promiseArr).then(ress => {
            resolve(result.sort((a, b) => moment(b.created_at, 'DD-MM-YYYY').diff(moment(a.created_at, 'DD-MM-YYYY'))))
        })
    })
}

// Function to check if all quizzes in a mission are answered by a user
async function checkQuizStatus(treasure_hunt_id, user_id) {

    // Get the list of quizzes the user has answered for the mission
    const userHunts = await UserTreasureHuntModel.findOne({ user_id: new ObjectID(user_id), treasure_hunt_id: new ObjectID(treasure_hunt_id) });

    if (!userHunts) {
        // If there are no user answers for this mission, return object indicating all unanswered
        return {
            answered: 0
        };
    }
    if (userHunts && userHunts.quiz_answers && Array.isArray(userHunts.quiz_answers)) {
        const answeredQuizIds = userHunts.quiz_answers.map(answer => {
            if (answer && answer.treasure_hunt_quiz_id) {
                return answer.treasure_hunt_quiz_id.toString();
            } else {
                return null; // or any other value to indicate missing quiz ID
            }
        });
        return {
            answered: answeredQuizIds.length
        };

        // Rest of your code
    } else {
        // If userMission.quiz_answers is not an array or undefined, return object indicating all unanswered
        return {
            answered: 0
        };
    }

}
