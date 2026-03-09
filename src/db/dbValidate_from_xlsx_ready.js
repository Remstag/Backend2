
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const Branch = require("../models/BranchModel");
const Person = require("../models/PersonModel");
const Relationship = require("../models/RelationshipModel");
const seed = require("./seedData/xlsx_seed_data.json");

(async () => {
  const userErrors = [];
  const branchErrors = [];
  const personErrors = [];
  const relationshipErrors = [];

  const fakeIds = {
    admin: new mongoose.Types.ObjectId(),
    editor: new mongoose.Types.ObjectId(),
    member: new mongoose.Types.ObjectId(),
    branch: new mongoose.Types.ObjectId(),
  };

  for (const u of seed.users) {
    const doc = new User({
      username: u.username,
      email: u.email,
      passwordHash: "hashed",
      fullName: u.fullName,
      role: u.role,
      isFirstLogin: u.isFirstLogin,
    });
    const err = doc.validateSync();
    if (err) userErrors.push({ username: u.username, error: err.message });
  }

  for (const b of seed.branches) {
    const doc = new Branch({
      name: b.name,
      branchCode: b.branchCode,
      description: b.description,
      ownerId: fakeIds.admin,
      members: [
        { userId: fakeIds.admin, roleInBranch: "owner" },
        { userId: fakeIds.editor, roleInBranch: "editor" },
        { userId: fakeIds.member, roleInBranch: "viewer" },
      ],
    });
    const err = doc.validateSync();
    if (err) branchErrors.push({ branchCode: b.branchCode, error: err.message });
  }

  const personIds = new Map();
  for (const p of seed.persons) {
    const id = new mongoose.Types.ObjectId();
    personIds.set(p.sourceRow, id);
    const doc = new Person({
      branchId: fakeIds.branch,
      fullName: p.fullName,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
      lunarDeathDate: p.lunarDeathDate || undefined,
      address: p.address || "",
      phone: p.phone || "",
      privacy: p.privacy || "internal",
      note: p.note || "",
      generation: p.generation ?? null,
      createdBy: fakeIds.admin,
      updatedBy: fakeIds.admin,
      linkedUserId: null,
    });
    const err = doc.validateSync();
    if (err) personErrors.push({ sourceRow: p.sourceRow, fullName: p.fullName, error: err.message });
  }

  for (const r of seed.relationships) {
    const doc = new Relationship({
      branchId: fakeIds.branch,
      fromPersonId: personIds.get(r.fromSourceRow),
      toPersonId: personIds.get(r.toSourceRow),
      type: r.type,
      createdBy: fakeIds.admin,
    });
    const err = doc.validateSync();
    if (err) relationshipErrors.push({ relationship: r, error: err.message });
  }

  console.log(JSON.stringify({
    users: { total: seed.users.length, errors: userErrors.length, samples: userErrors.slice(0, 5) },
    branches: { total: seed.branches.length, errors: branchErrors.length, samples: branchErrors.slice(0, 5) },
    persons: { total: seed.persons.length, errors: personErrors.length, samples: personErrors.slice(0, 5) },
    relationships: { total: seed.relationships.length, errors: relationshipErrors.length, samples: relationshipErrors.slice(0, 5) }
  }, null, 2));
})();
