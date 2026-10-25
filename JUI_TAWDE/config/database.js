const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load .env from JUI_TAWDE directory or fallback to parent root
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quiz_arena";

// Mask credentials in connection URI for safe logging
function getSanitizedUri(uri) {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
  } catch {
    return "mongodb://[sanitized]";
  }
}

let isConnected = false;

async function connectDB(customUri = null) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const targetUri = customUri || MONGODB_URI;

  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000
    });

    isConnected = true;
    console.log(`[Database] MongoDB connected successfully to: ${getSanitizedUri(targetUri)}`);
    return mongoose.connection;
  } catch (err) {
    isConnected = false;
    console.error(`[Database] MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      isConnected = false;
      console.log("[Database] MongoDB connection closed.");
    } catch (err) {
      console.error("[Database] Error disconnecting MongoDB:", err.message);
    }
  }
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("[Database] MongoDB disconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error("[Database] MongoDB runtime error:", err.message);
});

module.exports = {
  connectDB,
  disconnectDB,
  MONGODB_URI
};
