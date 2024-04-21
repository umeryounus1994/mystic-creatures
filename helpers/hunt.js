const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const haversine = require('haversine');
const TreasureHuntQuizModel = require("../src/v1/models/treasurequiz.model");
const TreasureHuntQuizOptionModel = require("../src/v1/models/treasurequizoption.model");

module.exports.getAllTreasureHunt = async function (data, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findTreasureHuntQuiz = await TreasureHuntQuizModel.find({ treasure_hunt_id: new ObjectID(element._id) })
                    var quizPromises = findTreasureHuntQuiz.map(async (quiz) => {
                        let endLocation = {
                            latitude: quiz.location.coordinates[1],
                            longitude: quiz.location.coordinates[0]
                        }
                        const userLocation = {
                            latitude: latitude,
                            longitude: longitude
                        }
                        const locationDistance = haversine(userLocation, endLocation, { unit: 'meter' })
                        if (locationDistance < 30) {
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
                        }
                    });
                    var quizzesWithOptions = await Promise.all(quizPromises);
                    var el = {
                        id: element._id,
                        treasure_hunt_title: element.treasure_hunt_title,
                        no_of_xp: element.no_of_xp,
                        no_of_crypes: element.no_of_crypes,
                        level_increase: element.level_increase,
                        mythica: element.mythica,
                        mythica_ar_model: element.mythica_ar_model,
                        status: element.status,
                        treasure_hunt_image: element.treasure_hunt_image,
                        quiz: quizzesWithOptions
                    }
                    const filteredArray = quizzesWithOptions.filter(element => element != null);
                    if (filteredArray.length > 0) {
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

module.exports.getSingleHunt = async function (data, latitude, longitude) {
    var findTreasureHuntQuiz = await TreasureHuntQuizModel.find({ treasure_hunt_id: new ObjectID(data._id) })
    var quizPromises = findTreasureHuntQuiz.map(async (quiz) => {
        let endLocation = {
            latitude: quiz.location.coordinates[1],
            longitude: quiz.location.coordinates[0]
        }
        const userLocation = {
            latitude: latitude,
            longitude: longitude
        }
        const locationDistance = haversine(userLocation, endLocation, { unit: 'meter' })
        if (locationDistance < 30) {
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
        }

    });

    var quizzesWithOptions = await Promise.all(quizPromises);
    var el = {
        id: data._id,
        treasure_hunt_title: data.treasure_hunt_title,
        no_of_xp: data.no_of_xp,
        no_of_crypes: data.no_of_crypes,
        level_increase: data.level_increase,
        mythica: data.mythica,
        mythica_ar_model: data.mythica_ar_model,
        status: data.status,
        treasure_hunt_image: data.treasure_hunt_image,
        quiz: quizzesWithOptions
    }
    const filteredArray = quizzesWithOptions.filter(element => element != null);
    if (filteredArray.length > 0) {
        return el;
    } else {
        return [];
    }

}