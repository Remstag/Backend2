const { z } = require("zod");

const updateMeSchema = z.object({
    fullName: z.string().min(1).max(100).optional(),
    phone: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional().or(z.literal("")),
});

const updateUserRoleSchema = z.object({
    role: z.enum(["admin", "editor", "member", "guest"]),
});

const banUserSchema = z.object({
    isBanned: z.boolean(),
});

const createUserFromPersonSchema = z.object({
    personId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid person ID format"),
});

module.exports = {
    updateMeSchema,
    updateUserRoleSchema,
    banUserSchema,
    createUserFromPersonSchema
};
