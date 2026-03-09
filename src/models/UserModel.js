const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, trim: true, index: true },
        email: { type: String, lowercase: true, trim: true, default: "" },
        passwordHash: { type: String, required: true },
        fullName: { type: String, default: "" },
        phone: { type: String, default: "" },
        address: { type: String, default: "" },
        avatarUrl: { type: String, default: "" },
        role: {
            type: String,
            enum: ["admin", "editor", "member", "guest"],
            default: "member",
            index: true,
        },
        isBanned: { type: Boolean, default: false },
        isFirstLogin: { type: Boolean, default: true },
        linkedPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "Person", default: null, index: true },
        lastLoginAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
