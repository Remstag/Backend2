
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/UserModel");

async function listPrivilegedUsers() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ role: { $in: ["admin", "editor"] } }).select("username fullName role");
    console.log("Privileged Users (Admin/Editor):");
    console.table(users.map(u => ({ username: u.username, name: u.fullName, role: u.role })));
    await mongoose.disconnect();
}
listPrivilegedUsers();
