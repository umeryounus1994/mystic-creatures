const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');



module.exports.getAllFriends = async function (data, id) {
    const promiseArr = [];
    var result = [];
    return new Promise((resolve, reject) => {
        data.forEach(element => {
            promiseArr.push(
                new Promise(async (resolvve, rejectt) => {
                    var el = {
                        request_id: element?._id,
                        friend_username: element?.user_id?._id == id ? element?.friend_id?.username : element?.user_id?.username ,
                        friend_id: element?.user_id?._id == id ? element?.friend_id?._id : element?.user_id?._id,
                        friend_image: element?.user_id?._id == id ? element?.friend_id?.image : element?.user_id?.image,
                        status: element?.status,
                        requested_date: element?.created_at
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