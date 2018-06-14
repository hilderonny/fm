var router = require('express').Router();
var auth = require("../middlewares/auth");
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');

async function getSchema(user) {
    console.log("GETSCHEMA", user);
    return buildSchema(`
        type Query {
            hello: String
        }
    `);
}

async function getRootValue(user) {
    console.log("GETROOTVALUE", user);
    var username = user ? user.name : "UNAMEDONE";
    return  {
        hello: () => {
            return `Hello ${username}!`;
        },
    };
}

/**
 * Interactive endpoint GraphiQL
 */
router.get('/', auth.try(), graphqlHTTP(async (req, res, graphQLParams) => ({
    schema: await getSchema(req.user),
    rootValue: await getRootValue(req.user),
    graphiql: true
})));

/**
 * GraphQL API endpoint
 */
router.post('/', auth.try(), graphqlHTTP(async (req, res, graphQLParams) => ({
    schema: await getSchema(req.user),
    rootValue: await getRootValue(req.user),
    graphiql: false
})));

//  router.post('/', auth.try(), async (req, res) => {
//     var schema = buildSchema(`
//         type Query {
//             hello: String
//         }
//     `);
//     var root = {
//         hello: () => {
//             return 'Hello world!';
//         },
//     };
//     var response = await graphql(schema, '{ hello }', root);
//     res.send(response);
// });

module.exports = router;

// // API for providing GraphQL API access
// var graphqlHTTP = require('../middlewares/graphql');
// var graphql = require('graphql');
// var { buildSchema } = require('graphql');
// var mc = require("../config/module-config.json");
// var Db = require("../utils/db").Db;

// var clientname = "737e7b80437b45e5b0def70b55d022df";

// var portaldatatypes = {};
// var clientdatatypes = {};
// var alldatatypes = {};

// Object.values(mc.modules).forEach(m => {
//     if (m.portaldatatypes) {
//         m.portaldatatypes.forEach(pdt => {
//             portaldatatypes[pdt.name] = pdt;
//             alldatatypes[pdt.name] = pdt;
//         });
//     }
//     if (m.clientdatatypes) {
//         m.clientdatatypes.forEach(cdt => {
//             clientdatatypes[cdt.name] = cdt;
//             alldatatypes[cdt.name] = cdt;
//         });
//     }
// });

// function createType(typename, fields) {
//     var typedef = `type ${typename} {\n${fields.join("\n")}\n}\n`;
//     return typedef;
// }

// // function createQueryType() {
// //     //var fields = Object.keys(datatypes).map(dtn => `${dtn}: [${dtn}]\n`);
// //     return createType("Query", fields);
// // }

// function createSchema() {
//     var typedefs = [];
//     Object.values(alldatatypes).forEach(dt => {
//         var fields = [ "name: String!" ];
//         if (dt.fields) dt.fields.forEach(f => {
//             fields.push(`${f.name}: String`);
//         });
//         typedefs.push(createType(dt.name, fields));
//     });
//     typedefs.push(createType("Portal", Object.keys(portaldatatypes).map(pdtn => `${pdtn}: [${pdtn}]\n`)));
//     typedefs.push(createType("Client", Object.keys(clientdatatypes).map(cdtn => `${cdtn}: [${cdtn}]\n`)));
//     typedefs.push(createType("Query", [ "portal: Portal", "client(name: String): Client" ]));
//     return typedefs.join("\n");
// }

// function createRoot() {
//     var rootNode = {
//         portal: () => {
//         },
//         client: (params) => {
//             var clientNode = {};
//             Object.values(clientdatatypes).forEach(dt => {
//                 clientNode[dt.name] = () => {
//                     return Db.getDynamicObjects(params.name, dt.name);
//                 }
//             });
//             return clientNode;
//         }
//     };
//     Object.values(portaldatatypes).forEach(dt => {
//         rootNode.portal[dt.name] = () => {
//             return Db.getDynamicObjects(Db.PortalDatabaseName, dt.name);
//         }
//     });
//     return rootNode;
// }

// var queryType = new graphql.GraphQLObjectType({
//     name: 'Query',
//     fields: {
//         portal: {
//             type: graphql.GraphQLString
//         },
//         final: {
//             type: graphql.GraphQLString
//         }
//     }
// });

// var schema = new graphql.GraphQLSchema({
//     query: queryType
// });

// // var schema = buildSchema(createSchema());
// var rootNode = createRoot();

// var options = {
//     schema: schema,
//     rootValue: rootNode,
//     graphiql: true,
// };

// var middleware = graphqlHTTP(options);

// // options.schema und options.rootType lassen sich nachträglich ändern. So können dynamisch
// // Schemas umdefiniert werden.
// // Besser wäre es aber, in der eigenen Middleware Funktionen getSchema() und getRootType()
// // zu verwenden, damit auch abhängig von der Anmeldung unterschiedliche Schemata zurück gegeben
// // werden können

// // console.log(options.schema);
// setTimeout(() => {
//     options.schema = buildSchema(`
//     type Query {
//         furz: String
//         husten: String
//     }
//     `);
//     // console.log(options.schema);
// }, 10000);

// module.exports = middleware;