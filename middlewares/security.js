function replaceQuotes(str) {
    return ("" + str).replace(/"/g, '""').replace(/'/g, "''");
//    return ("" + str).replace(/"/g, "\\\"").replace(/'/g, "\\'").replace(/´/g, "\\´").replace(/`/g, "\\`");
}

function handleObject(obj) {
    if (!obj) return;
    Object.keys(obj).forEach(k => {
        var value = obj[k];
        console.log(typeof(value));
        switch (typeof(value)) {
            case "string": obj[k] = replaceQuotes(value); break;
            case "object": handleObject(value); break;
            case "boolean": break; // Is okay so
            case "number": break; // Is okay so
            default: console.log("Unknown type " + typeof(value)); delete obj[k]; break; // Unknown type, delete it because we do not know how to handle it
        }
    });
}

/**
 * Middleware to prevent SQL injection by filtering quotes out of request bodies and parameters
 */
module.exports = (req, res, next) => {
    Object.keys(req.params).forEach(pk => {
        console.log("param before", pk, req.params[pk]);
        req.params[pk] = replaceQuotes(req.params[pk]);
        console.log("param after", pk, req.params[pk]);
    });
    Object.keys(req.query).forEach(pk => {
        console.log("query before", pk, req.query[pk]);
        req.query[pk] = replaceQuotes(req.query[pk]);
        console.log("query after", pk, req.query[pk]);
    });
    console.log("body before", req.body);
    handleObject(req.body);
    console.log("body after", req.body);
    next();        
};