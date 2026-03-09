const AuditLog = require("../models/AuditLogModel");
const { success } = require("../utils/responseHandler");

exports.listAuditLogs = async (req, res, next) => {
    try {
        const { actorId, entityType, dateFrom, dateTo } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        let query = {};
        if (actorId) query.actorUserId = actorId;
        if (entityType) query.entityType = entityType;
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        const logs = await AuditLog.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate("actorUserId", "fullName email");

        const total = await AuditLog.countDocuments(query);

        return success(res, logs, { page, limit, total, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        next(err);
    }
};

exports.getAuditLog = async (req, res, next) => {
    try {
        const log = await AuditLog.findById(req.params.id)
            .populate("actorUserId", "fullName email");

        if (!log) {
            const error = new Error("Audit log not found");
            error.statusCode = 404;
            error.code = "NOT_FOUND";
            throw error;
        }
        return success(res, log);
    } catch (err) {
        next(err);
    }
};
