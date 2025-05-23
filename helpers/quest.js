const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const QuestQuizModel = require("../src/v1/models/questquiz.model");
const QuestModel = require("../src/v1/models/quest.model");
const QuestPurchaseModel = require("../src/v1/models/questpurchases.model");
const UserQuestGroupModel = require("../src/v1/models/userquestgroup.model");

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
                        quest_title : element.quest_title ? element.quest_title : "",
                        quest_question : element.quest_question,
                        qr_code: element.qr_code,
                        quest_image: element.quest_image,
                        quest_type: element.quest_type,
                        no_of_xp: element.no_of_xp,
                        no_of_crypes : element.no_of_crypes,
                        reward_file: element.reward_file,
                        mythica: element?.mythica_ID?.creature_name,
                        mythica_ID: element?.mythica_ID?.creature_id,
                        level_increase: element.level_increase,
                        mythica_model: element.mythica_model,
                        status: element.status,
                        options: findQuestQuiz,
                        created_at: element.created_at,
                        assigned_group: element?.quest_group_id ? element?.quest_group_id?.quest_group_name : "N/A",
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


module.exports.getAllPlayerQuests = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findQuest = await QuestModel.findOne({_id: new ObjectID(element.quest_id)})
                    .populate('mythica_ID')
                    var findQuestQuiz = await QuestQuizModel.find({quest_id: new ObjectID(element.quest_id)})
                    var el ={}
                    var el ={
                        id: findQuest._id,
                        quest_title : findQuest.quest_title ? findQuest.quest_title : "",
                        quest_question : findQuest.quest_question,
                        status: element.status,
                        quest_image: findQuest.quest_image,
                        quest_type: findQuest.quest_type,
                        qr_code: findQuest.qr_code,
                        no_of_xp: findQuest.no_of_xp,
                        reward_file: findQuest.reward_file,
                        no_of_crypes : findQuest.no_of_crypes,
                        mythica: findQuest.mythica_ID?.creature_name,
                        level_increase: findQuest.level_increase,
                        mythica_ID: findQuest.mythica_ID?.creature_id,
                        options: findQuestQuiz,
                        quest_progress: element?.submitted_answer ? 1 : 0,
                        created_at: findQuest.created_at
                    }
                    if(findQuest.status == 'active'){
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
module.exports.getAllQuestGroups = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var findQuests = await QuestModel.find({quest_group_id: new ObjectID(element._id), status: 'active'})
                    .populate([
                        {
                            path: 'mythica_ID', select: {
                                creature_id: 1
                            }
                        }])
                    var questPurchase = await QuestPurchaseModel.findOne({quest_group_id: new ObjectID(element?._id)});
                    var questGroupPurchase = await UserQuestGroupModel.findOne({quest_group_id: new ObjectID(element?._id)});
                    var el ={}
                    var el ={
                        id: element._id,
                        quest_group_name : element.quest_group_name ? element.quest_group_name : "",
                        qr_code : element.qr_code,
                        no_of_crypes : element.no_of_crypes,
                        reward_file: element.reward_file,
                        package: element.group_package,
                        status: element.status,
                        quests: questPurchase != null ? findQuests : [],
                        is_purchased: questPurchase != null ? true : false,
                        created_at: element.created_at,
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