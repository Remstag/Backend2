const { z } = require("zod");

const uploadMediaSchema = z.object({
    branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branchId"),
    personId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid personId").optional().nullable(),
    eventId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid eventId").optional().nullable(),
    caption: z.string().max(1000).optional().default(""),
    privacy: z.enum(["public", "internal", "sensitive"]).optional().default("internal"),
});

const updateMediaSchema = z.object({
    caption: z.string().max(1000).optional(),
    privacy: z.enum(["public", "internal", "sensitive"]).optional(),
    personId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid personId").optional().nullable(),
    eventId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid eventId").optional().nullable(),
});

module.exports = { uploadMediaSchema, updateMediaSchema };
