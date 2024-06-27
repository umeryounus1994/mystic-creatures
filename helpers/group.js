const ObjectID = require('mongodb').ObjectId;
var moment = require('moment');



module.exports.getAllMyGroups = async function (groupusers) {
    var result = [];
    groupusers.forEach(element => {
        var op = {
         group_id: element?.group_id?._id,
         group_name: element?.group_id?.group_name,
         group_icon: element?.group_id?.group_icon
        }; 
        result.push(op);
     });
     return result;
}