
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const Person = require("../models/PersonModel");

async function listAssignments() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ role: { $in: ["admin", "editor"] } }).populate("linkedPersonId");

    console.log("Current Privileged Assignments:");
    const tableData = users.map(u => ({
        Username: u.username,
        Role: u.role,
        "Linked Person": u.linkedPersonId ? u.linkedPersonId.fullName : "None (System Account)"
    }));
    console.table(tableData);

    const totalMembers = await User.countDocuments({ role: "member" });
    console.log(`\nTotal users with 'member' role: ${totalMembers}`);

    await mongoose.disconnect();
}
listAssignments();
