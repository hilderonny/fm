/**
 * Middleware which disables caching
 * http://stackoverflow.com/a/20429914
 */

module.exports = (req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
};