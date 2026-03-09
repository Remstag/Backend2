require("dotenv").config();
const mongoose = require("mongoose");
const Branch = require("../models/BranchModel");
const AuditLog = require("../models/AuditLogModel");

async function migrate() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("Missing MONGO_URI in .env");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB for migration...");

        // 1. Update Branches
        const branches = await Branch.find({ name: /Chi nhánh/ });
        console.log(`Found ${branches.length} branches to update.`);

        for (let b of branches) {
            const oldName = b.name;
            b.name = b.name.replace(/Chi nhánh/g, "Chi cành");
            if (b.description) {
                b.description = b.description.replace(/Chi nhánh/g, "Chi cành");
            }
            await b.save();
            console.log(`Updated Branch: "${oldName}" -> "${b.name}"`);
        }

        // 2. Update Audit Logs (optional but good for consistency)
        const logs = await AuditLog.find({
            $or: [
                { "before.name": /Chi nhánh/ },
                { "after.name": /Chi nhánh/ }
            ]
        });
        console.log(`Found ${logs.length} audit logs to potentially update.`);

        // This is more complex since logs are often immutable, 
        // but for a naming convention change, we can do it if requested.
        // For now, let's focus on primary data.

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
