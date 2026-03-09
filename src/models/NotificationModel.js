const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        body: { type: String, required: true, trim: true },

        // Sent by an Admin
        sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        // targetAll = true means every user gets it; 
        // targetUsers = specific user IDs override targetAll
        targetAll: { type: Boolean, default: true },
        targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        // Track which users have read it
        readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        type: { type: String, enum: ["system", "event", "moderation"], default: "system" },
    },
    { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ targetAll: 1 });
NotificationSchema.index({ targetUsers: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
