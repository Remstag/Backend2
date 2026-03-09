
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const Person = require("../models/PersonModel");
require("../models/BranchModel");

async function checkAdminNaming() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ username: { $in: ["admin", "editor", "member"] } }).populate("linkedPersonId");

    console.log("Current Admin Accounts vs Structured Rule:");
    for (const user of users) {
        const p = user.linkedPersonId;
        if (p) {
            const branch = await mongoose.model("Branch").findById(p.branchId);
            const genStr = (p.generation || 1).toString().padStart(2, "0");
            const branchCode = branch ? branch.branchCode : "??";
            // We'd have to calculate seq, but let's just see current state
            console.log(`- User [${user.username}] is linked to: ${p.fullName} (Gen ${p.generation}) in Branch ${branchCode}`);
        } else {
            console.log(`- User [${user.username}] is NOT linked to any person.`);
        }
    }
    await mongoose.disconnect();
}
checkAdminNaming();
