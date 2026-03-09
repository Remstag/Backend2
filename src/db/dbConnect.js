const mongoose = require("mongoose");

async function connectDB() {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("Missing MONGO_URI in .env");

    console.log("Connecting to MongoDB Cluster...");
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log("MongoDB connected");
}

module.exports = { connectDB };