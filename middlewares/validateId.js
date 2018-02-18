// OBSOLETE

/**
 * Middleware for routers which checks the ID given as parameter for validity.
 * An ID for MongoDB must be either a 12 or 24 character string.
 * Used in routers as handler chain.
 */

module.exports = (req, res, next) => {
    if (!module.exports.validateId(req.params.id)) {
        return res.sendStatus(400);
    }
    next();
}

/**
 * Validates the given ID and return true when okay and false when not.
 * Can be called with require('validateId').validateId(id);
 */
module.exports.validateId = (id) => {
    return !!id;
};
