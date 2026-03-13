const errorHandler = (err, req, res, next) => {
    console.error("ERROR => ", err.stack || err); // Log the full error stack

    // Default error status and message
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle specific error types if needed (e.g., validation errors)
    // if (err.name === 'ValidationError') {
    //   statusCode = 400;
    //   message = err.message;
    // }

    // Send JSON response
    res.status(statusCode).json({
        error: message,
        // Optionally include stack trace in development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;