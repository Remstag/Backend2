
require("dotenv").config();
const mongoose = require("mongoose");
const Person = require("../models/PersonModel");
const { lunarToSolar } = require("../utils/lunarHelper");

async function sync() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("Missing MONGO_URI");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const persons = await Person.find({});
    console.log(`Processing ${persons.length} persons...`);

    let updatedCount = 0;
    const currentYear = new Date().getFullYear();

    for (const p of persons) {
        let isAlive = true;

        // 1. Check if death date exists (Solar or Lunar)
        if (p.dateOfDeath || (p.lunarDeathDate && p.lunarDeathDate.year)) {
            isAlive = false;
        }

        // 2. Check by age (if birth year < 1920, assume deceased)
        if (isAlive && p.dateOfBirth) {
            const birthYear = new Date(p.dateOfBirth).getFullYear();
            if (birthYear < 1920) isAlive = false;
        }
        if (isAlive && p.lunarBirthDate && p.lunarBirthDate.year) {
            if (p.lunarBirthDate.year < 1920) isAlive = false;
        }

        // 3. Early generations are certainly deceased
        if (isAlive && p.generation && p.generation < 7) {
            isAlive = false;
        }

        // 4. Keywords
        const text = (p.fullName + " " + (p.note || "")).toLowerCase();
        if (isAlive && (text.includes("đã mất") || text.includes("mộ tại") || text.includes("thuỷ tổ"))) {
            isAlive = false;
        }

        p.isAlive = isAlive;

        // Sync Solar from Lunar if missing
        if (!p.dateOfDeath && p.lunarDeathDate && p.lunarDeathDate.day && p.lunarDeathDate.month && p.lunarDeathDate.year) {
            const solar = await lunarToSolar(
                p.lunarDeathDate.day,
                p.lunarDeathDate.month,
                p.lunarDeathDate.year,
                p.lunarDeathDate.isLeap
            );
            if (solar) p.dateOfDeath = solar;
        }

        await p.save();
        updatedCount++;
        if (updatedCount % 500 === 0) console.log(`Processed ${updatedCount}...`);
    }

    console.log(`Sync complete. Updated ${updatedCount} persons.`);
    await mongoose.disconnect();
}

sync().catch(err => {
    console.error(err);
    process.exit(1);
});
