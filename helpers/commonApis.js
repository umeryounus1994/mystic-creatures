const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const moment = require("moment");
const apiResponse = require("./apiResponse");

exports.getPagination = async ({ req, res, model, findOptions }) => {
  const order = req.query.order ? req.query.order : "desc";
  const sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  const page = req.query.page > 0 ? req.query.page : 1;
  const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 100;
  const term = req.query.search;
  const { id } = req.params;
  if (term || id) {
    const total = await model.count(findOptions).exec();
    model
      .find(findOptions)
      .limit(perPage)
      .skip(perPage * (+page - 1))
      .sort([[sortBy, order]])
      .exec((err, data) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
            "System went wrong, Kindly try again later"
          );
        }
        return apiResponse.successResponseWithPagination(
          res,
          page,
          total,
          perPage,
          data
        );
      });
  } else {
    const total = await model.count().exec();
    model
      .find()
      .limit(perPage)
      .skip(perPage * (+page - 1))
      .sort([[sortBy, order]])
      .exec((err, data) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
            "System went wrong, Kindly try again later"
          );
        }
        return apiResponse.successResponseWithPagination(
          res,
          page,
          total,
          perPage,
          data
        );
      });
  }
};

exports.getPaginationWithPopulate = async ({
  req,
  res,
  model,
  findOptions,
  populateObject,
}) => {
  const order = req.query.order ? req.query.order : "desc";
  const sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  const page = req.query.page > 0 ? req.query.page : 1;
  const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
  const term = req.query.search;
  const { id } = req.params;
  if (term || id) {
    const total = await model.count(findOptions).exec();
    model
      .find(findOptions)
      .populate(populateObject)
      .select("-password")
      .limit(perPage)
      .skip(perPage * (+page - 1))
      .sort([[sortBy, order]])
      .exec((err, data) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
            "System went wrong, Kindly try again later"
          );
        }
        return apiResponse.successResponseWithPagination(
          res,
          page,
          total,
          perPage,
          data
        );
      });
  } else {
    const total = await model.count().exec();
    model
      .find()
      .populate(populateObject)
      .limit(perPage)
      .skip(perPage * (+page - 1))
      .sort([[sortBy, order]])
      .exec((err, data) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
            "System went wrong, Kindly try again later"
          );
        }
        return apiResponse.successResponseWithPagination(
          res,
          page,
          total,
          perPage,
          data
        );
      });
  }
};

exports.getItem = async ({ id, Model, res, populate = undefined }) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return apiResponse.validationErrorWithData(
      res,
      "Beklager, det oppstod en valideringsfeil.",
      "Validation Error",
      "Ugyldig ID"
    );
  }
  try {
    let item;
    if (populate) {
      item = await Model.findById(id).populate([populate]);
    } else {
      item = await Model.findById(id);
    }
    if (!item) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }

    return apiResponse.successResponseWithData(
      res,
      "Data Fetched Successfully",
      item
    );
  } catch (err) {
    return apiResponse.ErrorResponse(
      res,
      "System went wrong, Kindly try again later"
    );
  }
};

exports.softDelete = async ({ req, res, Model, itemName }) => {
  try {
    Model.findById(req.params.id, (_, item) => {
      if (item === null) {
        return apiResponse.notFoundResponse(res,  "Not found!");
      }
      item.delete((err, data) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "System went wrong, Kindly try again later"
          );
        }
        return apiResponse.successResponseWithData(
          res,
          "Deleted Successfully",
          data
        );
      });
    });
  } catch (err) {
    return apiResponse.ErrorResponse(
      res,
      "System went wrong, Kindly try again later"
    );
  }
};

exports.hardDelete = async ({ req, res, Model, itemName }) => {
  try {
    Model.findById(req.params.id, (_, driver) => {
      if (driver === null) {
        return apiResponse.notFoundResponse(res, "Not found!");
      }
      Model.findByIdAndDelete(req.params.id, (err) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "System went wrong, Kindly try again later"
          );
        }
        return apiResponse.successResponse(
          res,
          "Deleted successfully"
        );
      });
    });
  } catch (err) {
    return apiResponse.ErrorResponse(
      res,
      "System went wrong, Kindly try again later"
    );
  }
};

exports.createItem = async ({ req, res, Model, itemName }) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const createdItem = new Model(itemDetails);

    createdItem.save(async (err) => {
      if (err) {
        if (err?.keyValue?.email != null && err?.code === 11000) {
          return apiResponse.ErrorResponse(
            res,
            "Email already in use"
          );
        }
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
    return apiResponse.ErrorResponse(
      res,
      "System went wrong, Kindly try again later"
    );
  }
};

exports.updateItem = async ({ req, res, Model, itemName }) => {
  try {
    const { ...itemDetails } = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Ugyldig ID"
      );
    }
    Model.findById(req.params.id, async (err, foundItem) => {
      if (err) {
        return apiResponse.ErrorResponse(
          res,
          "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
          "System went wrong, Kindly try again later"
        );
      }
      if (foundItem === null) {
        return apiResponse.notFoundResponse(res, "Beklager, vi finner ikke dataen du ser etter.", "Not found!");
      }

      const updateRecord = await Model.findOneAndUpdate(
        {
          _id: req.params.id,
        },
        {
          $set: itemDetails,
        },
        { new: true }
      );
      if (updateRecord === null) {
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      return apiResponse.successResponseWithData(
        res,
        "updated successfully",
        updateRecord
      );
    });
  } catch (err) {
    return apiResponse.ErrorResponse(
      res,
      "System went wrong, Kindly try again later"
    );
  }
};

exports.totalItems = async ({ req, res, Model, itemName }) => {
  try {
    const totalItems = await Model.count({
      $and: [
        {
          loged_in_user_id: req.user._id,
        },
      ],
    }).exec();

    return apiResponse.successResponseWithData(
      res,
      `Total no of ${itemName} successfully found`,
      {
        totalItems,
      }
    );
  } catch (err) {
    return apiResponse.ErrorResponse(
      res,
      "System went wrong, Kindly try again later"
    );
  }
};

exports.getItemWithPopulate = async ({ query, Model, populateObject, res }) => {
  try {
    const item = await Model.findOne(query).populate(populateObject);
    if (!item) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Data Fetched Successfully",
      item
    );
  } catch (err) {
    return apiResponse.ErrorResponse(
      res,
      "System went wrong, Kindly try again later"
    );
  }
};

exports.totalItemsCustomQuery = async ({
  req,
  res,
  Model,
  query,
  itemName,
}) => {
  try {
    const totalItems = await Model.count(query).exec();
    return apiResponse.successResponseWithData(
      res,
      `Total no of ${itemName} successfully found`,
      {
        totalItems,
      }
    );
  } catch (err) {
    return apiResponse.ErrorResponse(
      res,
      "System went wrong, Kindly try again later"
    );
  }
};

exports.getFilterOptions = (req) => {
  const { filter } = req.query;
  const { startDate, endDate } = req.query;
  if (filter) {
    const [durationType, duration] = filter.split("-");
    return {
      createdAt: {
        $gte: new Date(
          moment()
            .subtract(parseInt(duration, 10), durationType)
            .format("yyyy-MM-DD")
        ),
      },
    };
  }
  if (startDate && endDate) {
    return {
      $and: [
        {
          createdAt: {
            $gte: new Date(moment(startDate).format("yyyy-MM-DD")),
          },
        },
        {
          createdAt: {
            $lte: new Date(moment(endDate).format("yyyy-MM-DD")),
          },
        },
      ],
    };
  }
  return undefined;
};

exports.getFilterOptionsmeTimeline = (req) => {
  const { year } = req.query;

  if (year) {
    const startDate = moment([year]).format("yyyy-MM-DD");

    const endDate = moment(startDate)
      .clone()
      .endOf("year")
      .format("yyyy-MM-DD");

    return {
      meeting_date: {
        $lt: endDate,
        $gt: startDate,
      },
    };
  }
  return undefined;
};

exports.getFilterOptionsTransactionsyearly = (req) => {
  const { filter } = req.query;
  if (filter) {
    const startDate = moment([filter]).format("yyyy-MM-DD");

    const endDate = moment(startDate)
      .clone()
      .endOf("year")
      .format("yyyy-MM-DD");

    return {
      createdAt: {
        $lt: endDate,
        $gt: startDate,
      },
    };
  }
  return undefined;
};

exports.hashPassord = async ({ password }) => {
  const salt = await bcrypt.genSalt(10);
  const newHashPassword = await bcrypt.hash(password, salt);
  return newHashPassword;
};
