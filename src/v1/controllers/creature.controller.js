/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const CreatureModel = require("../models/creature.model");


const addCreature = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    if(req.body.creature_name == "" || req.body.creature_name == undefined){
        return apiResponse.ErrorResponse(
            res,
            "Creature Name is required"
          );
    }
    if(req.body.creature_description == "" || req.body.creature_description == undefined){
        return apiResponse.ErrorResponse(
            res,
            "Description is required"
          );
    }
    if(req.body.creature_element == "" || req.body.creature_element == undefined){
        return apiResponse.ErrorResponse(
            res,
            "Creature Element is required"
          );
    }
    const createdItem = new CreatureModel(itemDetails);

    createdItem.save(async (err) => {
      if (err) {
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      return apiResponse.successResponseWithData(
        res,
        "Created successfully",
        createdItem
      );
    });
  } catch (err) {
    next(err);
  }
};

const listCreatures = async (req, res, next) => {
  try {
    const creatures = await CreatureModel.find({})
    .populate([
        {
            path: 'creature_skill1', select: { skill_name: 1, skill_element: 1,skill_damage_value:1 }
        },
        {
            path: 'creature_skill2' , select: { skill_name: 1, skill_element: 1,skill_damage_value:1 }
        },
        {
            path: 'creature_skill3' , select: { skill_name: 1, skill_element: 1,skill_damage_value:1 }
        },
        {
            path: 'creature_skill4' , select: { skill_name: 1, skill_element: 1,skill_damage_value:1 }
        }]);
    return res.json({
      status: true,
      message: "Data Found",
      data: creatures
    })
  } catch (err) {
    next(err);
  }
};

const updateCreature = async (req, res, next) => {
  try {

    const updatedMythica = await CreatureModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    // Something went wrong kindly try again later
    if (!updatedMythica) {
      return apiResponse.ErrorResponse(
        res,
        "Something went wrong, Kindly try again later"
      );
    }

    return apiResponse.successResponseWithData(
      res,
      "Mythica Details Updated",
      updatedMythica
    );
  } catch (err) {
    next(err);
  }
};


module.exports = {
    addCreature,
    listCreatures,
    updateCreature
};
