const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const PictureMysteryQuizModel = require("../src/v1/models/picturemysteriesquiz.model");
const PictureMysteryModel = require("../src/v1/models/picturemysteries.model");

module.exports.getAllPictureMystery = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findQuestQuiz = await PictureMysteryQuizModel.find({picture_mystery_id: new ObjectID(element._id)})
                    var el ={}
                    var el ={
                        id: element._id,
                        picture_mystery_question : element.picture_mystery_question ? element.picture_mystery_question : "",
                        picture_mystery_question_url : element.picture_mystery_question_url,
                        qr_code: element.qr_code,
                        no_of_xp: element.no_of_xp,
                        no_of_crypes : element.no_of_crypes,
                        mythica: element?.mythica_ID?.creature_name,
                        mythica_ID: element?.mythica_ID?.creature_id,
                        level_increase: element.level_increase,
                        mythica_model: element.mythica_model,
                        status: element.status,
                        options: findQuestQuiz
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


module.exports.getAllPictureMystery = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findQuest = await PictureMysteryModel.findOne({_id: new ObjectID(element.picture_mystery_id)})
                    .populate('mythica_ID')
                    var findQuestQuiz = await PictureMysteryQuizModel.find({picture_mystery_id: new ObjectID(element.picture_mystery_id)})
                    var el ={}
                    var el ={
                        id: findQuest._id,
                        picture_mystery_question : findQuest.picture_mystery_question ? findQuest.picture_mystery_question : "",
                        picture_mystery_question_url : findQuest.picture_mystery_question_url,
                        status: element.status,
                        no_of_xp: findQuest.no_of_xp,
                        no_of_crypes : findQuest.no_of_crypes,
                        mythica: findQuest.mythica_ID?.creature_name,
                        level_increase: findQuest.level_increase,
                        mythica_ID: findQuest.mythica_ID?.creature_id,
                        options: findQuestQuiz,
                        mystery_progress: element?.submitted_answer ? 1 : 0
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