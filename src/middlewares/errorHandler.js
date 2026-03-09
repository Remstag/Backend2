const { error } = require("../utils/responseHandler");

const errorHandler = (err, req, res, next) => {
    console.error(`ERROR [${req.method} ${req.originalUrl}]:`, err.stack || err);

    let errorResponse = {
        code: err.code || "INTERNAL_SERVER_ERROR",
        message: err.message || "Something went wrong",
        details: err.details || null,
    };
    let status = err.status || 500;

    // Mongoose Invalid ID
    if (err.name === "CastError") {
        status = 400;
        errorResponse = {
            code: "BAD_REQUEST_INVALID_ID",
            message: `Invalid resource ID: ${err.value}`,
        };
    }

    // Mongoose Validation Error
    if (err.name === "ValidationError") {
        status = 400;
        errorResponse = {
            code: "VALIDATION_ERROR",
            message: Object.values(err.errors).map(val => val.message).join(", "),
        };
    }

    // Mongoose Duplicate Key Error
    if (err.code === 11000) {
        status = 409;
        const field = Object.keys(err.keyValue)[0];
        errorResponse = {
            code: "DUPLICATE_KEY",
            message: `Duplicate field: ${field}. Please use another value.`,
        };
    }

    // JWT Errors
    if (err.name === "JsonWebTokenError") {
        status = 401;
        errorResponse = {
            code: "AUTH_INVALID_TOKEN",
            message: "Invalid authentication token",
        };
    }

    if (err.name === "TokenExpiredError") {
        status = 401;
        errorResponse = {
            code: "AUTH_TOKEN_EXPIRED",
            message: "Authentication token has expired",
        };
    }

    return error(res, errorResponse, status);
};

module.exports = errorHandler;
