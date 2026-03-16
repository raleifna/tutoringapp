function notFound(req, res, next) {
    // means this route doesn't exist
    const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    err.statusCode = 404;
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


module.exports = { notFound, errorHandler };
