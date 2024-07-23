const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');
const PictureMysteryQuizModel = require("../src/v1/models/picturemysteriesquiz.model");
const haversine = require('haversine');

module.exports.getAllPictureMystery = async function (data, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    let endLocation = {
                        latitude: element.mystery_location.coordinates[0],
                        longitude: element.mystery_location.coordinates[1]
                    }
                    const userLocation = {
                        latitude: latitude,
                        longitude: longitude
                    }
                    const locationDistance = haversine(userLocation, endLocation, { unit: 'km' })
                    if (locationDistance < 2) {
                        var findQuestQuiz = await PictureMysteryQuizModel.find({picture_mystery_id: new ObjectID(element._id)})
                        var el ={}
                        var el ={
                            id: element._id,
                            picture_mystery_question : element.picture_mystery_question ? element.picture_mystery_question : "",
                            picture_mystery_question_url : element.picture_mystery_question_url,
                            no_of_xp: element.no_of_xp,
                            no_of_crypes : element.no_of_crypes,
                            mythica: element?.mythica_ID?.creature_name,
                            mythica_ID: element?.mythica_ID?.creature_id,
                            level_increase: element.level_increase,
                            mythica_model: element.mythica_model,
                            status: element.status,
                            options: findQuestQuiz,
                            location: element?.mystery_location
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


module.exports.getAllUserMysteries = async function (data, latitude, longitude) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    let endLocation = {
                        latitude: element.picture_mystery_id?.mystery_location.coordinates[0],
                        longitude: element.picture_mystery_id?.mystery_location.coordinates[1]
                    }
                    const userLocation = {
                        latitude: latitude,
                        longitude: longitude
                    }
                    const locationDistance = haversine(userLocation, endLocation, { unit: 'km' })
                    if (locationDistance < 2) {
                        var findQuestQuiz = await PictureMysteryQuizModel.find({picture_mystery_id: new ObjectID(element._id)})
                        var el ={}
                        var el ={
                            id: element._id,
                            picture_mystery_question : element.picture_mystery_question ? element.picture_mystery_question : "",
                            picture_mystery_question_url : element.picture_mystery_question_url,
                            no_of_xp: element.no_of_xp,
                            no_of_crypes : element.no_of_crypes,
                            mythica: element?.mythica_ID?.creature_name,
                            mythica_ID: element?.mythica_ID?.creature_id,
                            level_increase: element.level_increase,
                            mythica_model: element.mythica_model,
                            status: element.status,
                            options: findQuestQuiz,
                            location: element?.mystery_location
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

module.exports.getSingleMystery = async function (element) {
    var findMissionQuiz = await PictureMysteryQuizModel.find({ picture_mystery_id: new ObjectID(element._id) });
    var el = {
        id: element._id,
        picture_mystery_question : element.picture_mystery_question ? element.picture_mystery_question : "",
        picture_mystery_question_url : element.picture_mystery_question_url,
        no_of_xp: element.no_of_xp,
        no_of_crypes : element.no_of_crypes,
        mythica: element?.mythica_ID?.creature_name,
        mythica_ID: element?.mythica_ID?.creature_id,
        level_increase: element.level_increase,
        mythica_model: element.mythica_model,
        status: element.status,
        location: element?.mystery_location,
        options: findMissionQuiz
    }

    return el;

}

module.exports.getAllPictureMysteryAdmin = async function (data) {
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
                            no_of_xp: element.no_of_xp,
                            no_of_crypes : element.no_of_crypes,
                            mythica: element?.mythica_ID?.creature_name,
                            mythica_ID: element?.mythica_ID?.creature_id,
                            level_increase: element.level_increase,
                            mythica_model: element.mythica_model,
                            status: element.status,
                            options: findQuestQuiz,
                            location: element?.mystery_location
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