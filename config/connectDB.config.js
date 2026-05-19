/* eslint-disable no-process-exit */
/* eslint-disable no-console */
exports.connectDB = async () => {
  // eslint-disable-next-line global-require
  const mongoose = require("mongoose");

  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("mongodb connected.");
    })
    .catch((err) => console.log(err.message));

  mongoose.connection.on("connected", async () => {
    console.log("Mongoose connected to db");
    try {
      const UserModel = require("../src/v1/models/user.model");
      await UserModel.collection.updateMany(
        { $or: [{ username: null }, { username: "" }] },
        { $unset: { username: "" } }
      );
      await UserModel.syncIndexes();
      console.log("User indexes synced (username sparse unique)");
    } catch (indexErr) {
      console.error("User index sync failed:", indexErr.message);
    }
  });

  mongoose.connection.on("error", (err) => {
    console.log(err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("Mongoose connection is disconnected.");
  });

  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
};
