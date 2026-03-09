
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("../models/UserModel");
const Branch = require("../models/BranchModel");
const Person = require("../models/PersonModel");
const Relationship = require("../models/RelationshipModel");
const Event = require("../models/EventModel");
const Media = require("../models/MediaModel");
const AuditLog = require("../models/AuditLogModel");
const RefreshToken = require("../models/RefreshTokenModel");

const seed = require("./seedData/xlsx_seed_data.json");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGO_URI in .env");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

async function clearCollections() {
  await Promise.all([
    RefreshToken.deleteMany({}),
    AuditLog.deleteMany({}),
    Media.deleteMany({}),
    Event.deleteMany({}),
    Relationship.deleteMany({}),
    Person.deleteMany({}),
    Branch.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log("Cleared collections");
}

async function buildUsers() {
  const passwordHash = await bcrypt.hash("123456", 10);
  return seed.users.map((u) => ({
    username: u.username,
    email: u.email,
    passwordHash,
    fullName: u.fullName,
    role: u.role,
    isFirstLogin: u.isFirstLogin,
  }));
}

(async () => {
  try {
    await connectDB();
    await clearCollections();

    const users = await buildUsers();
    const insertedUsers = await User.insertMany(users);
    const userByEmail = new Map(insertedUsers.map((u) => [u.email, u]));

    const admin = userByEmail.get("admin@gp.local");
    const editor = userByEmail.get("editor@gp.local");
    const member = userByEmail.get("member@gp.local");

    const branchDocs = seed.branches.map((b) => ({
      name: b.name,
      branchCode: b.branchCode,
      description: b.description,
      ownerId: admin._id,
      members: [
        { userId: admin._id, roleInBranch: "owner" },
        { userId: editor._id, roleInBranch: "editor" },
        { userId: member._id, roleInBranch: "viewer" },
      ],
    }));

    const insertedBranches = await Branch.insertMany(branchDocs);
    const branch = insertedBranches[0];

    const personDocs = seed.persons.map((p) => ({
      branchId: branch._id,
      fullName: p.fullName,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
      lunarDeathDate: p.lunarDeathDate || undefined,
      address: p.address || "",
      phone: p.phone || "",
      privacy: p.privacy || "internal",
      note: p.note || "",
      generation: p.generation ?? null,
      createdBy: admin._id,
      updatedBy: admin._id,
    }));

    const insertedPersons = await Person.insertMany(personDocs, { ordered: true });
    const personBySourceRow = new Map();
    seed.persons.forEach((p, idx) => {
      personBySourceRow.set(p.sourceRow, insertedPersons[idx]);
    });

    // link first 3 users to first 3 non-placeholder people if available
    const realPeople = seed.persons.filter((p) => !p.isPlaceholder);
    const links = [
      ["admin", realPeople[0]],
      ["editor", realPeople[1]],
      ["member", realPeople[2]],
    ];
    for (const [username, personSeed] of links) {
      if (!personSeed) continue;
      const user = insertedUsers.find((u) => u.username === username);
      const person = personBySourceRow.get(personSeed.sourceRow);
      if (user && person) {
        await User.updateOne({ _id: user._id }, { $set: { linkedPersonId: person._id } });
        await Person.updateOne({ _id: person._id }, { $set: { linkedUserId: user._id } });
      }
    }

    const relationshipDocs = [];
    const relSeen = new Set();
    for (const r of seed.relationships) {
      const from = personBySourceRow.get(r.fromSourceRow);
      const to = personBySourceRow.get(r.toSourceRow);
      if (!from || !to || String(from._id) === String(to._id)) continue;
      const key = `${from._id}::${to._id}::${r.type}`;
      if (relSeen.has(key)) continue;
      relSeen.add(key);
      relationshipDocs.push({
        branchId: branch._id,
        fromPersonId: from._id,
        toPersonId: to._id,
        type: r.type,
        createdBy: admin._id,
      });
    }

    await Relationship.insertMany(relationshipDocs, { ordered: false });

    console.log("Seed done");
    console.log(`Users: ${insertedUsers.length}`);
    console.log(`Branches: ${insertedBranches.length}`);
    console.log(`Persons: ${insertedPersons.length}`);
    console.log(`Relationships: ${relationshipDocs.length}`);
    console.log("Default accounts:");
    console.log("- admin / 123456");
    console.log("- editor / 123456");
    console.log("- member / 123456");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("dbLoad_from_xlsx_ready failed:", err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
})();
