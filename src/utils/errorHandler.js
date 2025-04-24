const logger = require("./logger");

const errorHandler = (err, req, res, next) => {
    logger.error(`${err.message} \t ${err.stack}`);
    const status = err.status || 500;
    res.status(status).json({
        error: true,
        message: err.message || 'Internal Server Error',
    });
}

module.exports = errorHandler;