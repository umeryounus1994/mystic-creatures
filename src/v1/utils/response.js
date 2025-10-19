const generateResponse = (res, statusCode, message, data = null, error = null) => {
    const response = {
        success: statusCode < 400,
        message,
        ...(data && { data }),
        ...(error && { error })
    };
    
    return res.status(statusCode).json(response);
};

module.exports = { generateResponse };