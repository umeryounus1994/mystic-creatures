/**
 * MCU-10 backfill: set language=german and default_image=chest
 * on existing TreasureHunt and Mission documents missing those fields.
 *
 * Usage:
 *   node scripts/mcu10-backfill-language-default-image.js
 *
 * Requires MONGODB_URI in .env (same as the app).
 */
require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is missing");
    process.exit(1);
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const TreasureHunt = require("../src/v1/models/treasure.model");
  const Mission = require("../src/v1/models/mission.model");

  const huntFilter = {
    $or: [
      { language: { $exists: false } },
      { language: null },
      { default_image: { $exists: false } },
      { default_image: null },
    ],
  };
  const missionFilter = {
    $or: [
      { language: { $exists: false } },
      { language: null },
      { default_image: { $exists: false } },
      { default_image: null },
    ],
  };

  const huntResult = await TreasureHunt.collection.updateMany(huntFilter, {
    $set: {
      language: "german",
      default_image: "chest",
    },
  });

  const missionResult = await Mission.collection.updateMany(missionFilter, {
    $set: {
      language: "german",
      default_image: "chest",
    },
  });

  console.log("TreasureHunt matched:", huntResult.matchedCount, "modified:", huntResult.modifiedCount);
  console.log("Mission matched:", missionResult.matchedCount, "modified:", missionResult.modifiedCount);

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
