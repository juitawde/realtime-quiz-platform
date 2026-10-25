/**
 * Database Module - Migrated to MongoDB via Mongoose.
 * Persistent models are defined in JUI_TAWDE/models/
 * Database connection configuration is located in JUI_TAWDE/config/database.js
 */
const { connectDB, disconnectDB } = require("../config/database");
const models = require("../models");

module.exports = {
  connectDB,
  disconnectDB,
  ...models
};
