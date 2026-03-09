const Relationship = require("../models/RelationshipModel");
const { success, error } = require("../utils/responseHandler");
const logAudit = require("../utils/auditLogger");

exports.createRelationship = async (req, res, next) => {
    try {
        const { branchId, fromPersonId, toPersonId, type } = req.body;

        if (fromPersonId === toPersonId) {
            return error(res, { code: "INVALID_RELATIONSHIP", message: "Cannot create relationship with self" }, 400);
        }

        // Check branch-level permission
        const Branch = require("../models/BranchModel");
        const branch = await Branch.findById(branchId);
        if (!branch) return error(res, { code: "BRANCH_NOT_FOUND", message: "Branch not found" }, 404);

        const isAdmin = req.user.role === "admin";
        const member = branch.members.find(m => m.userId.toString() === req.user.id);
        const isOwnerOrEditor = branch.ownerId.toString() === req.user.id || (member && ["editor", "owner"].includes(member.roleInBranch));

        if (!isAdmin && !isOwnerOrEditor) {
            return error(res, { code: "FORBIDDEN", message: "No permission to create relationship in this branch" }, 403);
        }

        // Symmetric check for certain types, though usually defined via schema, we can do a generic dual check
        const isSymmetric = ["spouse_of"].includes(type);
        const query = { branchId, type, $or: [{ fromPersonId, toPersonId }] };

        if (isSymmetric) {
            query.$or.push({ fromPersonId: toPersonId, toPersonId: fromPersonId });
        }

        const existing = await Relationship.findOne(query);
        if (existing) {
            return error(res, { code: "RELATIONSHIP_EXISTS", message: "Relationship already exists" }, 409);
        }

        // Cycle detection for parent_of relationships
        if (type === "parent_of") {
            const mongoose = require("mongoose");
            const isDescendant = await Relationship.aggregate([
                { $match: { toPersonId: new mongoose.Types.ObjectId(fromPersonId), type: "parent_of" } },
                {
                    $graphLookup: {
                        from: "relationships",
                        startWith: "$fromPersonId",
                        connectFromField: "fromPersonId",
                        connectToField: "toPersonId",
                        as: "ancestors",
                        maxDepth: 10,
                        restrictSearchWithMatch: { type: "parent_of" }
                    }
                },
                {
                    $match: {
                        $or: [
                            { fromPersonId: new mongoose.Types.ObjectId(toPersonId) },
                            { "ancestors.fromPersonId": new mongoose.Types.ObjectId(toPersonId) }
                        ]
                    }
                }
            ]);

            if (isDescendant.length > 0) {
                return error(res, { code: "CIRCULAR_RELATIONSHIP", message: "Cannot create relationship: this would cause a circular family tree" }, 400);
            }
        }

        const rel = await Relationship.create({
            branchId,
            fromPersonId,
            toPersonId,
            type,
            createdBy: req.user.id
        });

        await logAudit({
            actorId: req.user.id,
            action: "CREATE",
            entityType: "Relationship",
            entityId: rel._id,
            branchId: rel.branchId,
            after: rel
        }, req);

        return success(res, rel, null, 201);
    } catch (err) {
        next(err);
    }
};

exports.getRelationship = async (req, res, next) => {
    try {
        const rel = await Relationship.findById(req.params.id)
            .populate("fromPersonId", "fullName")
            .populate("toPersonId", "fullName");

        if (!rel) return error(res, { code: "NOT_FOUND", message: "Relationship not found" }, 404);
        return success(res, rel);
    } catch (err) {
        next(err);
    }
};

exports.getPersonRelationships = async (req, res, next) => {
    try {
        const { personId } = req.params;
        const rels = await Relationship.find({
            $or: [{ fromPersonId: personId }, { toPersonId: personId }]
        })
            .populate("fromPersonId", "fullName")
            .populate("toPersonId", "fullName");

        return success(res, rels);
    } catch (err) {
        next(err);
    }
};

// Update Relationship (change type)
exports.updateRelationship = async (req, res, next) => {
    try {
        const originalRel = await Relationship.findById(req.params.id);
        if (!originalRel) return error(res, { code: "NOT_FOUND", message: "Relationship not found" }, 404);

        // Check branch-level permission
        const Branch = require("../models/BranchModel");
        const branch = await Branch.findById(originalRel.branchId);
        if (branch) {
            const isAdmin = req.user.role === "admin";
            const member = branch.members.find(m => m.userId.toString() === req.user.id);
            const isOwnerOrEditor = branch.ownerId.toString() === req.user.id || (member && ["editor", "owner"].includes(member.roleInBranch));
            if (!isAdmin && !isOwnerOrEditor) {
                return error(res, { code: "FORBIDDEN", message: "No permission to update relationship in this branch" }, 403);
            }
        }

        const { type } = req.body;
        const updateFields = {};
        if (type !== undefined) updateFields.type = type;

        const rel = await Relationship.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true, runValidators: true }
        );

        await logAudit({
            actorId: req.user.id,
            action: "UPDATE",
            entityType: "Relationship",
            entityId: rel._id,
            branchId: rel.branchId,
            before: originalRel,
            after: rel
        }, req);

        return success(res, rel);
    } catch (err) {
        next(err);
    }
};

exports.deleteRelationship = async (req, res, next) => {
    try {
        const rel = await Relationship.findById(req.params.id);
        if (!rel) return error(res, { code: "NOT_FOUND", message: "Relationship not found" }, 404);

        // Check branch-level permission
        const Branch = require("../models/BranchModel");
        const branch = await Branch.findById(rel.branchId);
        if (branch) {
            const isAdmin = req.user.role === "admin";
            const member = branch.members.find(m => m.userId.toString() === req.user.id);
            const isOwnerOrEditor = branch.ownerId.toString() === req.user.id || (member && ["editor", "owner"].includes(member.roleInBranch));
            if (!isAdmin && !isOwnerOrEditor) {
                return error(res, { code: "FORBIDDEN", message: "No permission to delete relationship in this branch" }, 403);
            }
        }

        await Relationship.findByIdAndDelete(req.params.id);

        await logAudit({
            actorId: req.user.id,
            action: "DELETE",
            entityType: "Relationship",
            entityId: rel._id,
            branchId: rel.branchId,
            before: rel
        }, req);

        return success(res, { message: "Relationship deleted" });
    } catch (err) {
        next(err);
    }
};
