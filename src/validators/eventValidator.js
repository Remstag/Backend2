const { z } = require("zod");

const createEventSchema = z.object({
    branchId: z.string().min(1, "branchId is required"),
    title: z.string().min(1, "Title is required").max(300),
    type: z.enum(["birth", "death", "marriage", "anniversary", "other"]).optional().default("other"),
    eventDate: z.string().optional().nullable(),
    location: z.string().max(500).optional().default(""),
    description: z.string().max(5000).optional().default(""),
    personIds: z.array(z.string()).optional().default([]),
    privacy: z.enum(["public", "internal", "sensitive"]).optional().default("internal"),
    lunarEventDate: z.object({
        day: z.number().int().min(1).max(30),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(1200).max(2199),
        isLeap: z.boolean().optional()
    }).optional(),
    isLive: z.boolean().optional().default(false),
    streamUrl: z.string().optional().default(""),
    streamType: z.enum(["youtube", "facebook", "hls", "other"]).optional().default("youtube")
}).passthrough();

const updateEventSchema = z.object({
    branchId: z.string().optional(),
    title: z.string().min(1).max(300).optional(),
    type: z.enum(["birth", "death", "marriage", "anniversary", "other"]).optional(),
    eventDate: z.string().optional().nullable(),
    location: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    personIds: z.array(z.string()).optional(),
    privacy: z.enum(["public", "internal", "sensitive"]).optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    lunarEventDate: z.object({
        day: z.number().int().min(1).max(30),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(1200).max(2199),
        isLeap: z.boolean().optional()
    }).optional(),
    isLive: z.boolean().optional(),
    streamUrl: z.string().optional(),
    streamType: z.enum(["youtube", "facebook", "hls", "other"]).optional()
}).passthrough();

const updateEventStatusSchema = z.object({
    status: z.enum(["pending", "approved", "rejected"])
}).passthrough();

module.exports = { createEventSchema, updateEventSchema, updateEventStatusSchema };
