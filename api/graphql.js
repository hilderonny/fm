var router = require('express').Router();
var auth = require("../middlewares/auth");
var graphqlHTTP = require('express-graphql');
var graphql = require('graphql');
var lh = require("../utils/loginHelper");
var Db = require("../utils/db").Db;

// Constructing schema without query language: https://graphql.org/graphql-js/constructing-types/
function createLoginSchema() {
    return new graphql.GraphQLSchema({
        query: new graphql.GraphQLObjectType({
            name: "Query",
            description: "Use this query before each other call to login into the system and obtain an access token. After that use the token in any request as parameter \"?token=...\" for authentication.",
            fields: {
                login: { // Login endpoint
                    type: graphql.GraphQLString,
                    args: {
                        username: { type: graphql.GraphQLString },
                        password: { type: graphql.GraphQLString }
                    },
                    resolve: async(_, {username, password}) => {
                        var loginresult = await lh.getToken(username, password);
                        return loginresult ? loginresult.token : null;
                    }
                }
            }
        })
    });
}

/**
 * Erstellt einen GraphQL Datentypen für einen internen Datentypen.
 * Dabei haben momentan alle Felder den Typ String. Ist also derzeit 
 * nur für das Auslesen sinnvoll.
 */
function extractDatatype(clientname, datatype) {
    var objectfields = {};
    Object.values(datatype.fields).forEach(f => {
        objectfields[f.name] = { type: graphql.GraphQLString }
    });
    var objecttype = new graphql.GraphQLObjectType({
        name: datatype.name,
        fields: objectfields
    });
    return {
        type: new graphql.GraphQLList(objecttype),
        resolve: async() => {
            return Db.getDynamicObjects(clientname, datatype.name);
        }
    }
}

/**
 * Erstellt ein Schema für den angemeldeten Benutzer mit genau den Endpunkten, die für
 * den Benutzer verfügbar sind.
 */
async function createUserSchema(user) {
    var clientname = user.clientname;
    var queryfields = {};
    var datatypes = await Db.getdatatypes(clientname);
    Object.values(datatypes).forEach(dt => {
        if (dt.permissionkey && !user.permissions[dt.permissionkey]) return; // No access
        queryfields[dt.name] = extractDatatype(clientname, dt);
    });
    return new graphql.GraphQLSchema({
        query: new graphql.GraphQLObjectType({
            name: "Query",
            description: "This schema depends on the logged in user and provides only those endpoints available to him. When an user has read permissions for a datatype, he can query id. When the user also has write permissions, mutations for the datatype are provided too.",
            fields: queryfields
        })
    });
}

/**
 * Calculate schema for the currently logged in user.
 * For unauthenticated users (without token) only the login API
 * is available
 */
async function getSchema(user) {
    return user ? createUserSchema(user) : createLoginSchema();
}

/**
 * Interactive endpoint GraphiQL
 */
router.get('/', auth.try(), graphqlHTTP(async (req) => ({
    schema: await getSchema(req.user),
    graphiql: true
})));

/**
 * GraphQL API endpoint
 */
router.post('/', auth.try(), graphqlHTTP(async (req) => ({
    schema: await getSchema(req.user),
    graphiql: false
})));

module.exports = router;