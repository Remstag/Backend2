const Event = require("../models/EventModel");
const { success, error } = require("../utils/responseHandler");
const logAudit = require("../utils/auditLogger");
const { solarToLunar, lunarToSolar } = require("../utils/lunarHelper");
const securityGuard = require("../utils/securityGuard");

exports.createEvent = async (req, res, next) => {
    try {
        const { branchId, title, type, eventDate, location, description, personIds, privacy, isLive, streamUrl, streamType } = req.body;

        // Check branch-level permission
        const Branch = require("../models/BranchModel");
        const branch = await Branch.findById(branchId);
        if (!branch) return error(res, { code: "BRANCH_NOT_FOUND", message: "Branch not found" }, 404);

        const isAdmin = req.user.role === "admin";
        const member = branch.members.find(m => m.userId.toString() === req.user.id);
        const isOwnerOrEditor = branch.ownerId.toString() === req.user.id || (member && ["editor", "owner"].includes(member.roleInBranch));

        // members can create events (pending status)
        if (!isAdmin && !isOwnerOrEditor && req.user.role !== "member") {
            return error(res, { code: "FORBIDDEN", message: "No permission to create event in this branch" }, 403);
        }

        // Auto-approve if created by admin or editor
        const status = (req.user.role === "admin" || req.user.role === "editor") ? "approved" : "pending";

        const eventData = {
            branchId,
            title,
            type,
            eventDate,
            location,
            description,
            personIds,
            privacy,
            status,
            isLive: isLive || false,
            streamUrl: streamUrl || "",
            streamType: streamType || "youtube",
            createdBy: req.user.id
        };

        // Auto-sync Lunar/Solar dates
        if (eventDate && !req.body.lunarEventDate) {
            eventData.lunarEventDate = await solarToLunar(eventDate);
        } else if (req.body.lunarEventDate && !eventDate) {
            const { day, month, year, isLeap } = req.body.lunarEventDate;
            const solar = await lunarToSolar(day, month, year, isLeap);
            if (solar) eventData.eventDate = solar;
        }

        const event = await Event.create(eventData);
        const populatedEvent = await Event.findById(event._id).populate("branchId", "name");

        await logAudit({
            actorId: req.user.id,
            action: "CREATE",
            entityType: "Event",
            entityId: event._id,
            branchId: event.branchId,
            after: event
        }, req);

        return success(res, populatedEvent, null, 201);
    } catch (err) {
        next(err);
    }
};

exports.listEvents = async (req, res, next) => {
    try {
        const { branchId, personId, isLive } = req.query;
        const dateFrom = req.query.dateFrom || req.query.startDate;
        const dateTo = req.query.dateTo || req.query.endDate;
        const status = req.query.status;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        let query = {};
        if (branchId) query.branchId = branchId;
        if (personId) query.personIds = personId;
        if (status) query.status = status;
        if (isLive !== undefined) query.isLive = isLive === "true";
        if (dateFrom || dateTo) {
            query.eventDate = {};
            if (dateFrom) {
                const d = new Date(dateFrom);
                if (!isNaN(d.getTime())) query.eventDate.$gte = d;
            }
            if (dateTo) {
                const d = new Date(dateTo);
                if (!isNaN(d.getTime())) query.eventDate.$lte = d;
            }
            if (Object.keys(query.eventDate).length === 0) delete query.eventDate;
        }

        const events = await Event.find(query)
            .populate("branchId", "name")
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ eventDate: -1 });

        // Filter by privacy — remove items user cannot see
        const filtered = [];
        for (const evt of events) {
            const hasAccess = await securityGuard.checkPrivacy(evt, req.user);
            if (hasAccess) filtered.push(evt);
        }

        const totalBeforePrivacyFilter = await Event.countDocuments(query);
        const total = filtered.length; // Number of items on current page the user can see

        return success(res, filtered, { page, limit, total, totalBeforePrivacyFilter, totalPages: Math.ceil(totalBeforePrivacyFilter / limit) });
    } catch (err) {
        next(err);
    }
};

exports.getEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate("personIds", "fullName");

        if (!event) return error(res, { code: "NOT_FOUND", message: "Event not found" }, 404);

        const hasAccess = await securityGuard.checkPrivacy(event, req.user);
        if (!hasAccess) {
            return error(res, { code: "FORBIDDEN_PRIVATE_RESOURCE", message: "You do not have access to this event" }, 403);
        }

        return success(res, event);
    } catch (err) {
        next(err);
    }
};

exports.updateEvent = async (req, res, next) => {
    try {
        const originalEvent = await Event.findById(req.params.id);
        if (!originalEvent) return error(res, { code: "NOT_FOUND", message: "Event not found" }, 404);

        // Check branch-level permission
        const Branch = require("../models/BranchModel");
        const branch = await Branch.findById(originalEvent.branchId);
        if (branch) {
            const isAdmin = req.user.role === "admin";
            const member = branch.members.find(m => m.userId.toString() === req.user.id);
            const isOwnerOrEditor = branch.ownerId.toString() === req.user.id || (member && ["editor", "owner"].includes(member.roleInBranch));
            const isCreator = originalEvent.createdBy && originalEvent.createdBy.toString() === req.user.id;
            if (!isAdmin && !isOwnerOrEditor && !isCreator) {
                return error(res, { code: "FORBIDDEN", message: "No permission to update event in this branch" }, 403);
            }
        }

        const updateData = { ...req.body, updatedBy: req.user.id };
        console.log("BACKEND: Received Update Body:", req.body);

        // Auto-sync Lunar/Solar dates
        if (req.body.eventDate && !req.body.lunarEventDate) {
            updateData.lunarEventDate = await solarToLunar(req.body.eventDate);
        } else if (req.body.lunarEventDate && !req.body.eventDate) {
            const { day, month, year, isLeap } = req.body.lunarEventDate;
            const solar = await lunarToSolar(day, month, year, isLeap);
            if (solar) updateData.eventDate = solar;
        }

        console.log("BACKEND: Final Update Data before Mongoose:", updateData);

        const event = await Event.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate("branchId", "name");

        console.log("BACKEND: Event After Update:", {
            id: event._id,
            streamUrl: event.streamUrl,
            isLive: event.isLive,
            raw: event
        });

        await logAudit({
            actorId: req.user.id,
            action: "UPDATE",
            entityType: "Event",
            entityId: event._id,
            branchId: event.branchId,
            before: originalEvent,
            after: event
        }, req);

        return success(res, event);
    } catch (err) {
        next(err);
    }
};

exports.deleteEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return error(res, { code: "NOT_FOUND", message: "Event not found" }, 404);

        // Check branch-level permission
        const Branch = require("../models/BranchModel");
        const branch = await Branch.findById(event.branchId);
        if (branch) {
            const isAdmin = req.user.role === "admin";
            const member = branch.members.find(m => m.userId.toString() === req.user.id);
            const isOwnerOrEditor = branch.ownerId.toString() === req.user.id || (member && ["editor", "owner"].includes(member.roleInBranch));
            const isCreator = event.createdBy && event.createdBy.toString() === req.user.id;
            if (!isAdmin && !isOwnerOrEditor && !isCreator) {
                return error(res, { code: "FORBIDDEN", message: "No permission to delete event in this branch" }, 403);
            }
        }

        // Cascade delete related media (and cleanup files)
        const Media = require("../models/MediaModel");
        const fs = require("fs");
        const relatedMedia = await Media.find({ eventId: req.params.id });
        for (const m of relatedMedia) {
            if (m.storagePath && fs.existsSync(m.storagePath)) {
                fs.unlinkSync(m.storagePath);
            }
        }
        await Media.deleteMany({ eventId: req.params.id });

        await Event.findByIdAndDelete(req.params.id);

        await logAudit({
            actorId: req.user.id,
            action: "DELETE",
            entityType: "Event",
            entityId: event._id,
            branchId: event.branchId,
            before: event
        }, req);

        return success(res, { message: "Event deleted" });
    } catch (err) {
        next(err);
    }
};

exports.updateEventStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const originalEvent = await Event.findById(req.params.id);
        if (!originalEvent) return error(res, { code: "NOT_FOUND", message: "Event not found" }, 404);

        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { status, updatedBy: req.user.id },
            { new: true, runValidators: true }
        );

        await logAudit({
            actorId: req.user.id,
            action: "UPDATE_STATUS",
            entityType: "Event",
            entityId: event._id,
            branchId: event.branchId,
            before: { status: originalEvent.status },
            after: { status: event.status }
        }, req);

        return success(res, event);
    } catch (err) {
        next(err);
    }
};

exports.registerForEvent = async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event) return error(res, { code: "NOT_FOUND", message: "Event not found" }, 404);

        const alreadyRegistered = event.participants.some(p => p.userId.toString() === userId);
        if (alreadyRegistered) {
            return error(res, { code: "ALREADY_REGISTERED", message: "User is already registered" }, 400);
        }

        event.participants.push({ userId, status: "pending", registeredAt: new Date() });
        await event.save();

        await logAudit({
            actorId: userId,
            action: "REGISTER",
            entityType: "Event",
            entityId: event._id,
            branchId: event.branchId,
            after: { status: "pending" }
        }, req);

        return success(res, { message: "Registered successfully", status: "pending" });
    } catch (err) {
        next(err);
    }
};

exports.updateParticipantStatus = async (req, res, next) => {
    try {
        const { id, userId } = req.params;
        const { status } = req.body; // approved | rejected

        if (!["approved", "rejected"].includes(status)) {
            return error(res, "Invalid status", 400);
        }

        const event = await Event.findById(id);
        if (!event) return error(res, { code: "NOT_FOUND", message: "Event not found" }, 404);

        // Check permission: Admin, Event Creator, Branch Owner, or Branch Editor
        const Branch = require("../models/BranchModel");
        const branch = await Branch.findById(event.branchId);
        let hasPermission = req.user.role === "admin" || (event.createdBy && event.createdBy.toString() === req.user.id);
        if (branch) {
            const member = branch.members.find(m => m.userId.toString() === req.user.id);
            if (branch.ownerId.toString() === req.user.id || (member && ["editor", "owner"].includes(member.roleInBranch))) {
                hasPermission = true;
            }
        }

        if (!hasPermission) {
            return error(res, { code: "FORBIDDEN", message: "No permission to update participant status" }, 403);
        }

        const participantIndex = event.participants.findIndex(p => p.userId.toString() === userId);
        if (participantIndex === -1) {
            return error(res, { code: "NOT_FOUND", message: "Participant not found" }, 404);
        }

        event.participants[participantIndex].status = status;
        await event.save();

        await logAudit({
            actorId: req.user.id,
            action: "UPDATE_PARTICIPANT_STATUS",
            entityType: "Event",
            entityId: event._id,
            branchId: event.branchId,
            after: { userId, status }
        }, req);

        return success(res, { message: "Participant status updated", status });
    } catch (err) {
        next(err);
    }
};

