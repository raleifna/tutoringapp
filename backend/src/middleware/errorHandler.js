class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

function notFound(req, res, next) {
    // means this route doesn't exist
    const err = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404);
    next(err);
}

function errorHandler(err, req, res, next) {
    // use 500 by default
    res.status(err.statusCode || 500).json({
        success: false,
        // send the original error message if we have one
        message: err.message || 'Internal Server Error',
    });
}


module.exports = { AppError, notFound, errorHandler };
