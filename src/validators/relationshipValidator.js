const { z } = require("zod");

const createRelationshipSchema = z.object({
    branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branchId"),
    fromPersonId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid fromPersonId"),
    toPersonId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid toPersonId"),
    type: z.enum(["parent_of", "spouse_of", "sibling_of"], {
        errorMap: () => ({ message: "Type must be one of: parent_of, spouse_of, sibling_of" })
    }),
});

const updateRelationshipSchema = z.object({
    type: z.enum(["parent_of", "spouse_of", "sibling_of"], {
        errorMap: () => ({ message: "Type must be one of: parent_of, spouse_of, sibling_of" })
    }),
});

module.exports = { createRelationshipSchema, updateRelationshipSchema };
