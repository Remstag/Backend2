
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Person = require("../models/PersonModel");
const User = require("../models/UserModel");
require("../models/BranchModel"); // Needed for population

async function provision() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("Missing MONGO_URI");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Only provision living members or recent generations (e.g., gen > 5)
    // Actually, user said "apply to my website immediately", 
    // but usually we don't need accounts for deceased ancestors from 1700s.
    // Let's provision for everyone who is "isAlive: true"
    const persons = await Person.find({ linkedUserId: null, isAlive: true }).populate("branchId");
    console.log(`Found ${persons.length} living persons without accounts.`);

    let createdCount = 0;

    // Group by Branch and Generation to keep sequence clean
    const branchGenCounters = {};

    for (const person of persons) {
        try {
            const branch = person.branchId;
            if (!branch || !branch.branchCode) continue;

            const branchCode = branch.branchCode;
            const gen = person.generation || 1;
            const genStr = gen.toString().padStart(2, "0");

            // Initialize counter for this branch+gen if not already done
            const key = `${branch._id}_${gen}`;
            if (branchGenCounters[key] === undefined) {
                // Count existing users in this exact group
                branchGenCounters[key] = await User.countDocuments({
                    linkedPersonId: {
                        $in: await Person.find({
                            branchId: branch._id,
                            generation: gen
                        }).distinct("_id")
                    }
                });
            }

            branchGenCounters[key]++;
            const seqStr = branchGenCounters[key].toString().padStart(3, "0");
            const username = `${branchCode}${genStr}${seqStr}`;

            // Password logic
            let dobStr = "123456";
            const dateSource = person.dateOfBirth || (person.lunarBirthDate && person.lunarBirthDate.year ? new Date(person.lunarBirthDate.year, (person.lunarBirthDate.month || 1) - 1, person.lunarBirthDate.day || 1) : null);

            if (dateSource) {
                const d = new Date(dateSource);
                const day = d.getDate().toString().padStart(2, "0");
                const month = (d.getMonth() + 1).toString().padStart(2, "0");
                const year = d.getFullYear().toString().slice(-2);
                dobStr = `${day}${month}${year}`;
            }

            const passwordHash = await bcrypt.hash(dobStr, 10);

            const newUser = await User.create({
                username,
                passwordHash,
                fullName: person.fullName,
                role: "member",
                linkedPersonId: person._id,
                isFirstLogin: true
            });

            person.linkedUserId = newUser._id;
            await person.save();
            createdCount++;

            if (createdCount % 50 === 0) {
                console.log(`Created ${createdCount} accounts...`);
            }
        } catch (err) {
            console.error(`Failed for person ${person.fullName}:`, err.message);
        }
    }

    console.log(`Provisioning complete. Total accounts created: ${createdCount}`);
    await mongoose.disconnect();
}

provision().catch(err => {
    console.error(err);
    process.exit(1);
});
