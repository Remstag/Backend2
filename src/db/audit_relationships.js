
require("dotenv").config();
const mongoose = require("mongoose");
const Person = require("../models/PersonModel");
const Relationship = require("../models/RelationshipModel");

async function audit() {
    await mongoose.connect(process.env.MONGO_URI);
    const persons = await Person.find({});
    const personMap = new Map(persons.map(p => [p._id.toString(), p]));
    const relationships = await Relationship.find({});

    let ageAnomalies = [];
    let cycles = [];
    let selfRels = [];

    for (const rel of relationships) {
        const fromId = rel.fromPersonId.toString();
        const toId = rel.toPersonId.toString();
        const from = personMap.get(fromId);
        const to = personMap.get(toId);
        if (!from || !to) continue;

        if (fromId === toId) selfRels.push(`${from.fullName} (${fromId})`);

        if (rel.type === "parent_of") {
            const parentBirth = from.dateOfBirth ? new Date(from.dateOfBirth).getFullYear() : from.lunarBirthDate?.year;
            const childBirth = to.dateOfBirth ? new Date(to.dateOfBirth).getFullYear() : to.lunarBirthDate?.year;
            if (parentBirth && childBirth && parentBirth >= childBirth) {
                ageAnomalies.push(`Cha/Mẹ ${from.fullName} (${parentBirth}) trẻ hơn Con ${to.fullName} (${childBirth})`);
            }
        }
    }

    const parentMap = new Map();
    relationships.filter(r => r.type === "parent_of").forEach(r => {
        const childId = r.toPersonId.toString();
        const parentId = r.fromPersonId.toString();
        if (!parentMap.has(childId)) parentMap.set(childId, []);
        parentMap.get(childId).push(parentId);
    });

    for (const [childId, parents] of parentMap.entries()) {
        for (const parentId of parents) {
            if ((parentMap.get(parentId) || []).includes(childId)) {
                cycles.push(`${personMap.get(childId).fullName} <-> ${personMap.get(parentId).fullName}`);
            }
        }
    }

    console.log(JSON.stringify({ ageAnomalies, cycles, selfRels }, null, 2));
    await mongoose.disconnect();
}
audit();
