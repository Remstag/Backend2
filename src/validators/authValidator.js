const { z } = require("zod");

const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(50),
    email: z.string().email("Invalid email format").optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    fullName: z.string().min(1, "Full name is required").max(100),
});

const loginSchema = z.object({
    username: z.string().min(1, "Username/ID is required"),
    password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
