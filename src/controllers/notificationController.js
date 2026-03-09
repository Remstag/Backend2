const Notification = require("../models/NotificationModel");
const { success, error } = require("../utils/responseHandler");
const logAudit = require("../utils/auditLogger");

// Admin: Broadcast a notification to all users
exports.broadcast = async (req, res, next) => {
    console.log(">>> BROADCAST ATTEMPTED BY:", req.user?.email);
    try {
        if (req.user.role !== "admin") {
            return error(res, { code: "FORBIDDEN", message: "Only admins can broadcast notifications" }, 403);
        }

        const { title, body, targetUsers } = req.body;
        if (!title || !body) {
            return error(res, { code: "VALIDATION_ERROR", message: "Title and body are required" }, 400);
        }

        const notif = await Notification.create({
            title,
            body,
            sentBy: req.user.id,
            targetAll: !targetUsers || targetUsers.length === 0,
            targetUsers: targetUsers || [],
            type: "system"
        });

        await logAudit({
            actorId: req.user.id,
            action: "BROADCAST",
            entityType: "Notification",
            entityId: notif._id,
            after: notif
        }, req);

        return success(res, notif, null, 201);
    } catch (err) {
        next(err);
    }
};

// User: Get my notifications (targetAll OR I am in targetUsers)
exports.getMyNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const query = {
            $or: [
                { targetAll: true },
                { targetUsers: userId }
            ]
        };

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("sentBy", "fullName email"),
            Notification.countDocuments(query)
        ]);

        // Add isRead field for each notification
        const data = notifications.map(n => ({
            ...n.toObject(),
            isRead: n.readBy.some(id => id.toString() === userId)
        }));

        return success(res, data, { page, limit, total, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        next(err);
    }
};

// User: Get unread count (for bell badge)
exports.getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const count = await Notification.countDocuments({
            $or: [{ targetAll: true }, { targetUsers: userId }],
            readBy: { $ne: userId }
        });
        return success(res, { count });
    } catch (err) {
        next(err);
    }
};

// User: Mark notification as read
exports.markRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notif = await Notification.findById(req.params.id);
        if (!notif) return error(res, { code: "NOT_FOUND", message: "Notification not found" }, 404);

        if (!notif.readBy.some(id => id.toString() === userId)) {
            notif.readBy.push(userId);
            await notif.save();
        }
        return success(res, { message: "Marked as read" });
    } catch (err) {
        next(err);
    }
};

// User: Mark all as read
exports.markAllRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await Notification.updateMany(
            {
                $or: [{ targetAll: true }, { targetUsers: userId }],
                readBy: { $ne: userId }
            },
            { $push: { readBy: userId } }
        );
        return success(res, { message: "All notifications marked as read" });
    } catch (err) {
        next(err);
    }
};
