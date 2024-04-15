const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const MissionQuizModel = require("../src/v1/models/missionquiz.model");
const MissionQuizOptionModel = require("../src/v1/models/missionquizoption.model");

module.exports.getAllMissions = async function (data, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findMissionQuiz = await MissionQuizModel.find({mission_id: new ObjectID(element._id)})
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
                    var el ={
                        id: element._id,
                        mission_title : element.mission_title,
                        no_of_xp: element.no_of_xp,
                        no_of_crypes: element.no_of_crypes,
                        level_increase : element.level_increase,
                        mythica: element.mythica,
                        mythica_ar_model: element.mythica_ar_model,
                        status: element.status,
                        mission_image: element.mission_image,
                        quiz: quizzesWithOptions
                    }
                    // const locationDistance = haversine(userLocation, endLocation, { unit: 'meter' })
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
