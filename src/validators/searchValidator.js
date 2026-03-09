const { z } = require("zod");

const searchSchema = z.object({
    q: z.string().max(100, "Từ khóa quá dài").optional().or(z.literal("")),
    branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branchId").optional().or(z.literal("")),
    privacy: z.enum(["public", "internal", "sensitive"]).optional().or(z.literal("")),
    generation: z.string().regex(/^\d+$/, "Generation must be a number").optional().or(z.literal("")),
    page: z.string().regex(/^\d+$/, "Page must be a number").optional().or(z.literal("")),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional().or(z.literal(""))
});

module.exports = {
    searchSchema
};
