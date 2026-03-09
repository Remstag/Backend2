
require("dotenv").config();
const mongoose = require("mongoose");
const Person = require("../models/PersonModel");

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const total = await Person.countDocuments();
    const aliveCount = await Person.countDocuments({ isAlive: true });
    const deceasedCount = await Person.countDocuments({ isAlive: false });
    const unassignedCount = await Person.countDocuments({ isAlive: { $exists: false } });
    const linkedCount = await Person.countDocuments({ linkedUserId: { $ne: null } });
    const unlinkedCount = await Person.countDocuments({ linkedUserId: null });
    const unlinkedAlive = await Person.countDocuments({ linkedUserId: null, isAlive: true });

    console.log({ total, aliveCount, deceasedCount, unassignedCount, linkedCount, unlinkedCount, unlinkedAlive });
    await mongoose.disconnect();
}
check();
