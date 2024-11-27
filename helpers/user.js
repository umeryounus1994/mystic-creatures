const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const QuestModel = require("../src/v1/models/quest.model");
const MissionModel = require("../src/v1/models/mission.model");
const HuntModel = require("../src/v1/models/treasure.model");
const DropModel = require("../src/v1/models/drop.model");
const PictureMysteryModel = require("../src/v1/models/picturemysteries.model");
const FriendModel = require("../src/v1/models/friends.model");


module.exports.getAllPlayerData = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var xps = 0;
                    let crypes = 0;
                    let level = 0;
                    var el ={}
                    if(element?.quest_id){
                        var findQuest = await QuestModel.findOne({_id: new ObjectID(element.quest_id)})
                        .populate('mythica_ID');
                        if(findQuest){
                            el = {
                                mythica: findQuest?.mythica_ID?.creature_name,
                                mythica_ID: findQuest?.mythica_ID?.creature_id,
                                gender: findQuest?.mythica_ID?.creature_gender,
                                mythica_distinguisher: element.mythica_distinguisher,
                                reward_file: findQuest?.reward_file ? findQuest?.reward_file : "N/A",
                                total_xp : xps + findQuest?.no_of_xp
                            };
                            result.push(el);
                        }
                    }
                    if(element?.mission_id){
                        var findMission = await MissionModel.findOne({_id: new ObjectID(element.mission_id)})
                        .populate('mythica_ID');
                        if(findMission){
                            el = {
                                mythica: findMission?.mythica_ID?.creature_name,
                                mythica_ID: findMission?.mythica_ID?.creature_id,
                                gender: findMission?.mythica_ID?.creature_gender,
                                mythica_distinguisher: element.mythica_distinguisher,
                                reward_file: findMission?.reward_file ? findMission?.reward_file : "N/A",
                                total_xp : xps + findMission?.no_of_xp
                            };
                            result.push(el);
                        }
                    }
                    if(element?.hunt_id){
                        var findHunt = await HuntModel.findOne({_id: new ObjectID(element.hunt_id)})
                        .populate('mythica_ID');
                        if(findHunt){
                            el = {
                                mythica: findHunt?.mythica_ID?.creature_name,
                                mythica_ID: findHunt?.mythica_ID?.creature_id,
                                gender: findHunt?.mythica_ID?.creature_gender,
                                mythica_distinguisher: element.mythica_distinguisher,
                                reward_file: findHunt?.reward_file ? findHunt?.reward_file : "N/A",
                                total_xp : xps + findHunt?.no_of_xp
                            };
                            result.push(el);
                        }
                    }
                    if(element?.drop_id){
                        var findDrop = await DropModel.findOne({_id: new ObjectID(element.drop_id)})
                        .populate('mythica_ID');
                        if(findDrop){
                            el = {
                                mythica: findDrop?.mythica_ID?.creature_name,
                                mythica_ID: findDrop?.mythica_ID?.creature_id,
                                gender: findDrop?.mythica_ID?.creature_gender,
                                mythica_distinguisher: element.mythica_distinguisher,
                                reward_file: findDrop?.reward_file ? findDrop?.reward_file : "N/A",
                                total_xp : xps + findDrop?.no_of_xp
                            };
                            result.push(el);
                        }
                    }
                    if(element?.picture_mystery_id){
                        var findPictureMystery = await PictureMysteryModel.findOne({_id: new ObjectID(element.picture_mystery_id)})
                        .populate('mythica_ID');
                        if(findDrop){
                            el = {
                                mythica: findPictureMystery?.mythica_ID?.creature_name,
                                mythica_ID: findPictureMystery?.mythica_ID?.creature_id,
                                gender: findPictureMystery?.mythica_ID?.creature_gender,
                                mythica_distinguisher: element.mythica_distinguisher,
                                reward_file: findPictureMystery?.reward_file ? findPictureMystery?.reward_file : "N/A",
                                total_xp : xps + findPictureMystery?.no_of_xp
                            };
                            result.push(el);
                        }
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

module.exports.getAllUsers = async function (data, userId) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    const friendRecord = await FriendModel.findOne({
                        $or: [
                            { user_id: userId, friend_id: element?._id },
                            { user_id: element?._id, friend_id: userId }
                        ]
                    });
                
                    var checkFriend = await FriendModel.findOne({user_id: new ObjectID(userId), friend_id: new ObjectID(element?._id)});
                    var el = {
                        id: element?._id,
                        username: element?.username,
                        image: element?.image,
                        isFriend: friendRecord != null ? friendRecord.status : 'open',
                        created_at: element.created_at
                    }
                    result.push(el);
                    resolvve(result);
                })
            )
        })
        return Promise.all(promiseArr).then(ress => {
            resolve(result.sort((a, b) => moment(b.created_at, 'DD-MM-YYYY').diff(moment(a.created_at, 'DD-MM-YYYY'))))
        })
    })
}

module.exports.getAllUsersAdmin = async function (data) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var el = {
                        id: element?._id,
                        username: element?.username,
                        image: element?.image,
                        status: element?.status,
                        created_at: element.created_at,
                        type: element?.user_type ? element?.user_type : "user"
                    }
                    result.push(el);
                    resolvve(result);
                })
            )
        })
        return Promise.all(promiseArr).then(ress => {
            resolve(result.sort((a, b) => moment(b.created_at, 'DD-MM-YYYY').diff(moment(a.created_at, 'DD-MM-YYYY'))))
        })
    })
}