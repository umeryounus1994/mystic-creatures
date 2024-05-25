const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const haversine = require('haversine');
const MissionQuizModel = require("../src/v1/models/missionquiz.model");
const MissionQuizOptionModel = require("../src/v1/models/missionquizoption.model");
const UserMissionModel = require("../src/v1/models/usermission.model");

module.exports.getAllMissions = async function (data, user_id, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    let endLocation = {
                        latitude: element.mission_location.coordinates[0],
                        longitude: element.mission_location.coordinates[1]
                    }
                    const userLocation = {
                        latitude: latitude,
                        longitude: longitude
                    }
                    const locationDistance = haversine(userLocation, endLocation, { unit: 'km' })
                    if (locationDistance < 10) {
                        var findMissionQuiz = await MissionQuizModel.find({ mission_id: new ObjectID(element._id) })
                            .populate([
                                {
                                    path: 'mythica', select: {
                                        creature_name: 1, creature_element: 1, creature_rarity: 1,
                                        creature_weight: 1, creature_height: 1, creature_id: 1
                                    }
                                }])
                        var quizPromises = findMissionQuiz.map(async (quiz) => {

                            var options = await MissionQuizOptionModel.find({ mission_quiz_id: new ObjectID(quiz._id), mission_id: new ObjectID(element?._id) });
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
                        const userMissions = await UserMissionModel.findOne({ mission_id: new ObjectID(element?._id), user_id: new ObjectID(user_id) });
                        const checkProgress = await checkQuizStatus(element?._id, user_id)
                        var el = {
                            id: element._id,
                            mission_title: element.mission_title,
                            no_of_xp: element.no_of_xp,
                            no_of_crypes: element.no_of_crypes,
                            level_increase: element.level_increase,
                            mythica: element.mythica_ID?.creature_name,
                            mythica_ID: element?.mythica_ID?.creature_id,
                            status: element.status,
                            mission_image: element.mission_image,
                            quiz: filteredArray.length > 0 ? quizzesWithOptions : [],
                            mission_status: userMissions ? userMissions?.status : 'open',
                            mission_progress: checkProgress?.answered
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
module.exports.getAllAdminMissions = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findMissionQuiz = await MissionQuizModel.find({ mission_id: new ObjectID(element._id) })
                        .populate([
                            {
                                path: 'mythica', select: {
                                    creature_name: 1, creature_element: 1, creature_rarity: 1,
                                    creature_weight: 1, creature_height: 1, creature_id: 1
                                }
                            }])
                    var quizPromises = findMissionQuiz.map(async (quiz) => {
                        var options = await MissionQuizOptionModel.find({ mission_quiz_id: new ObjectID(quiz._id), mission_id: new ObjectID(element?._id) });
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
                        mission_title: element.mission_title,
                        no_of_xp: element.no_of_xp,
                        no_of_crypes: element.no_of_crypes,
                        level_increase: element.level_increase,
                        mythica: element.mythica_ID?.creature_name,
                        mythica_ID: element?.mythica_ID?.creature_id,
                        status: element.status,
                        mission_image: element.mission_image,
                        quiz: filteredArray.length > 0 ? quizzesWithOptions : [],
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

module.exports.getSingleMission = async function (data) {
    var findMissionQuiz = await MissionQuizModel.find({ mission_id: new ObjectID(data._id) })
        .populate([
            {
                path: 'mythica', select: {
                    creature_name: 1, creature_element: 1, creature_rarity: 1,
                    creature_weight: 1, creature_height: 1, creature_id: 1
                }
            }])
    var quizPromises = findMissionQuiz.map(async (quiz) => {

        var options = await MissionQuizOptionModel.find({ mission_quiz_id: new ObjectID(quiz._id), mission_id: new ObjectID(data?._id) });
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
        mission_title: data.mission_title,
        no_of_xp: data.no_of_xp,
        no_of_crypes: data.no_of_crypes,
        level_increase: data.level_increase,
        mythica: data.mythica_ID?.creature_name,
        mythica_ID: data?.mythica_ID?.creature_id,
        status: data.status,
        mission_image: data.mission_image,
        quiz: filteredArray.length > 0 ? quizzesWithOptions : [],
    }

    return el;

}

module.exports.getAllUserMissions = async function (data, user_id, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    let endLocation = {
                        latitude: element.mission_id?.mission_location.coordinates[0],
                        longitude: element.mission_id?.mission_location.coordinates[1]
                    }
                    const userLocation = {
                        latitude: latitude,
                        longitude: longitude
                    }
                    const locationDistance = haversine(userLocation, endLocation, { unit: 'km' })
                    if (locationDistance < 10) {
                        var findMissionQuiz = await MissionQuizModel.find({ mission_id: new ObjectID(element.mission_id) })
                            .populate([
                                {
                                    path: 'mythica', select: {
                                        creature_name: 1, creature_element: 1, creature_rarity: 1,
                                        creature_weight: 1, creature_height: 1, creature_id: 1
                                    }
                                }])
                        var quizPromises = findMissionQuiz.map(async (quiz) => {
                                var options = await MissionQuizOptionModel.find({ mission_quiz_id: new ObjectID(quiz._id), mission_id: new ObjectID(element?.mission_id) });
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
                        const checkProgress = await checkQuizStatus(element?.mission_id, user_id)
                        const filteredArray = quizzesWithOptions.filter(element => element != null);
                        var el = {
                            id: element.mission_id?.id,
                            mission_title: element?.mission_id.mission_title,
                            no_of_xp: element?.mission_id.no_of_xp,
                            no_of_crypes: element?.mission_id.no_of_crypes,
                            level_increase: element?.mission_id.level_increase,
                            mythica: element?.mission_id.mythica_ID?.creature_name,
                            mythica_ID: element?.mission_id.mythica_ID?.creature_id,
                            status: element.status,
                            mission_image: element?.mission_id.mission_image,
                            quiz: filteredArray.length > 0 ? quizzesWithOptions : [],
                            mission_progress: checkProgress?.answered,
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
async function checkQuizStatus(mission_id, user_id) {

    // Get the list of quizzes the user has answered for the mission
    const userMission = await UserMissionModel.findOne({ user_id: new ObjectID(user_id), mission_id: new ObjectID(mission_id) });

    if (!userMission) {
        // If there are no user answers for this mission, return object indicating all unanswered
        return {
            answered: 0
        };
    }

    if (userMission.quiz_answers && Array.isArray(userMission.quiz_answers)) {
        const answeredQuizIds = userMission.quiz_answers.map(answer => {
            if (answer && answer.mission_quiz_id) {
                return answer.mission_quiz_id.toString();
            } else {
                return null; // or any other value to indicate missing quiz ID
            }
        });

        return {
            answered: answeredQuizIds.length
        };
    } else {
        // If userMission.quiz_answers is not an array or undefined, return object indicating all unanswered
        return {
            answered: 0
        };
    }
}
