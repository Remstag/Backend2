const Person = require("../models/PersonModel");
const Event = require("../models/EventModel");
const Branch = require("../models/BranchModel");
const { success, error } = require("../utils/responseHandler");
const securityGuard = require("../utils/securityGuard");
const { filterPersonsByPrivacy } = require("../utils/privacyFilter");

exports.searchPersons = async (req, res, next) => {
    try {
        const { q, branchId, privacy, generation } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const qClean = q && q.trim() !== "" ? q : null;
        const branchIdClean = branchId && branchId.trim() !== "" ? branchId : null;
        const privacyClean = privacy && privacy.trim() !== "" ? privacy : null;
        const generationClean = generation && generation.trim() !== "" ? parseInt(generation) : null;

        let query = {};
        if (qClean) {
            query.$text = { $search: qClean };
        }

        if (branchIdClean) query.branchId = branchIdClean;
        if (privacyClean) query.privacy = privacyClean;
        if (generationClean) query.generation = generationClean;

        // If query is empty (no q and no filters), return empty list to avoid searching everything
        if (Object.keys(query).length === 0) {
            return success(res, [], { page, limit, total: 0, totalPages: 0 });
        }

        const findOptions = qClean ? { score: { $meta: "textScore" } } : {};
        const sortOptions = qClean ? { score: { $meta: "textScore" } } : { fullName: 1 };

        const persons = await Person.find(query, findOptions)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);

        const safePersons = await filterPersonsByPrivacy(persons, securityGuard, req.user);

        const totalBeforePrivacyFilter = await Person.countDocuments(query);
        const total = safePersons.length;

        return success(res, safePersons, {
            page,
            limit,
            total,
            totalBeforePrivacyFilter,
            totalPages: Math.ceil(totalBeforePrivacyFilter / limit)
        });
    } catch (err) {
        next(err);
    }
};

exports.searchEvents = async (req, res, next) => {
    try {
        const { q, branchId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const qClean = q && q.trim() !== "" ? q : null;
        const branchIdClean = branchId && branchId.trim() !== "" ? branchId : null;

        let query = {};
        if (qClean) {
            query.$text = { $search: qClean };
        }
        if (branchIdClean) query.branchId = branchIdClean;

        if (Object.keys(query).length === 0) {
            return success(res, [], { page, limit, total: 0, totalPages: 0 });
        }

        const findOptions = qClean ? { score: { $meta: "textScore" } } : {};
        const sortOptions = qClean ? { score: { $meta: "textScore" } } : { dateFrom: -1 };

        const events = await Event.find(query, findOptions)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);

        // Filter events by privacy
        const filteredEvents = [];
        for (const evt of events) {
            const hasAccess = await securityGuard.checkPrivacy(evt, req.user);
            if (hasAccess) filteredEvents.push(evt);
        }

        const totalBeforePrivacyFilter = await Event.countDocuments(query);
        const total = filteredEvents.length;

        return success(res, filteredEvents, {
            page,
            limit,
            total,
            totalBeforePrivacyFilter,
            totalPages: Math.ceil(totalBeforePrivacyFilter / limit)
        });
    } catch (err) {
        next(err);
    }
};

exports.searchBranches = async (req, res, next) => {
    try {
        const { q } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const qClean = q && q.trim() !== "" ? q : null;
        let baseQuery = {};

        if (qClean) {
            baseQuery = {
                $or: [
                    { name: { $regex: qClean, $options: "i" } },
                    { description: { $regex: qClean, $options: "i" } }
                ]
            };
        }

        // Apply membership filter for non-admins
        let query = baseQuery;
        if (req.user.role !== "admin") {
            query = {
                $and: [
                    baseQuery,
                    {
                        $or: [
                            { ownerId: req.user.id },
                            { "members.userId": req.user.id }
                        ]
                    }
                ]
            };
        }

        const branches = await Branch.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate("ownerId", "fullName email");

        const total = await Branch.countDocuments(query);

        return success(res, branches, { page, limit, total, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        next(err);
    }
};
