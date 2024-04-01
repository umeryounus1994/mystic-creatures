const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const QuestQuizModel = require("../src/v1/models/questquiz.model");

module.exports.getAllQuests = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findQuestQuiz = await QuestQuizModel.find({quest_id: new ObjectID(element._id)})
                    var el ={}
                    var el ={
                        id: element._id,
                        quest_question : element.quest_question,
                        qr_code: element.qr_code,
                        no_of_xp: element.no_of_xp,
                        no_of_crypes : element.no_of_crypes,
                        mythica: element.mythica,
                        mythica_model: element.mythica_model,
                        status: element.status,
                        options: findQuestQuiz,
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