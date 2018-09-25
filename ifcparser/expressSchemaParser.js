const readline = require('readline');
const fs = require('fs');

// RegExp tester: https://regexr.com/

const RE_ENTITY = /^\s*ENTITY\s*([a-zA-Z0-9_]+)\s*/g; // Check on start of entity, match[0] = 'ENTITY', match[1] = entity name
const RE_END_ENTITY = /^\s*END_ENTITY.*$/g;
const RE_SCHEMA = /^\s*SCHEMA\s*([a-zA-Z0-9]+)\s*/g;
const RE_END_SCHEMA = /^\s*END_SCHEMA.*$/g;
const RE_TYPE = /^\s*TYPE\s*([a-zA-Z0-9]+)\s*(\=)\s*([a-zA-Z0-9\ \[:\]]+)/g;
const RE_END_TYPE = /^\s*END_TYPE.*$/g;


function readSchema(filename) {
    
    return new Promise((resolve, reject) => {

        var currentSchema = null;
        var currentType = null;
        var currentEntity = null;
    
        var schema = { name: null, types: {}, entities: {} };
        
        /**
         * Replace white spaces at begin and end of string (line)
         */
        function trim(str) { return str.replace(/^\s+/g, '').replace(/\s+$/g, ''); }
        
        function checkForSchemaStart(line) {
            var check = RE_SCHEMA.exec(line);
            if (check) {
                currentSchema = check[1];
                schema.name = currentSchema;
            }
        }
        
        function checkForSCHEMAEnd(line) {
            var check = RE_END_SCHEMA.exec(line);
            if (check) currentSchema = null;
        }
        
        function checkForTypeStart(line) {
            var check = RE_TYPE.exec(line);
            if (check) {
                currentType = { type: check[3] };
                schema.types[check[1]] = currentType;
            }
        }
        
        function checkForTypeEnd(line) {
            var check = RE_END_TYPE.exec(line);
            if (check) currentType = null;
        }
        
        function checkForEntityStart(line) {
            var check = RE_ENTITY.exec(line);
            if (check) {
                currentEntity = { };
                schema.entities[check[1]] = currentEntity;
            }
        }
        
        function checkForEntityEnd(line) {
            var check = RE_END_ENTITY.exec(line);
            if (check) currentEntity = null;
        }
    
        readline.createInterface({
            input: fs.createReadStream(filename),
            crlfDelay: Infinity
        }).on('line', (line) => {
            line = trim(line);
            if (!currentSchema) {
                checkForSchemaStart(line);
                return; // Ignore all lines outside a schema
            }
            // Here we are in a schema
            // Are we in a type?
            if (currentType) {
                checkForTypeEnd(line);
                // Type end was found, return immediately
                if (!currentType) return;
                // Otherwise parse content of type, if there is any
                // TODO ...
            }
            // We are not in a type, so check for it
            if (!currentType) {
                checkForTypeStart(line);
                // Type start found, proceed to next line
                if (currentType) return;
            }
            // Now we are not in a type and the line does not start a type, check for entity
            if (currentEntity) {
                // We are in an entity, test for end first
                checkForEntityEnd(line);
                if (!currentEntity) return; // Entity end was found, skip to next line
                // We are still in the entity, so parse it
                // TODO ...
            }
            // We are not in an entity and not in a type, maybe an entity ist started?
            if (!currentEntity) {
                checkForEntityStart(line);
                if (currentEntity) return; // Entity start was found, skip to next line
            }
        }).on('close', () => {
            resolve(schema);
        });
        // grammar = {};


        // fs.readFile(filename, function (err, data) {
        // Split file content into lines
        // var lines = data.toString().split(/\r\n|\n/); 
        // lines = data.toString().split(/\r\n|\n/);
        // var mode = "None";
        // rgEntityStart = /^\s*ENTITY\s*([a-z_]+)\s*/g;
        // rgEntityEnd = /^\s*END_ENTITY.*$/g;
        // rgTypeStart = /^\s*TYPE\s*(\w+)\s*=\s*(.*)/g;
        // rgTypeEnd = /END_TYPE/g;
        // rgWhere = /^\s*WHERE\*/g;
        // var matches;
        // var bInWhere = false;
        // var subTypeOf, members;
        // lines.forEach(function (line) {
        //     line = trim(line);
        //     if (mode == "None") {
        //         // is this and ENTITY line ?
        //         matches = rgEntityStart.exec(line);
        //         if (matches) {
        //             entityName = matches[1];
        //             mode = "ENTITY";
        //             bInWhere = false;
        //             subTypeOf = null;
        //             members = [];
        //             return;
        //         }
        //         // is this a TYPE line ?
        //         matches = rgTypeStart.exec(line);
        //         if (matches) {
        //             // console.log("starting Type",matches[1],line);
        //             typeName = matches[1]
        //             typeDef = trim(matches[2])
        //             console.log(" Type = ", typeName, typeDef);
        //             mode = "TYPE";
        //             return;
        //         }
        //     } else if (mode == "ENTITY") {
        //         if (rgEntityEnd.test(line)) {
        //             // -------------------------------- end of entity definition
        //             // console.log(" ending entity" , entityName);
        //             grammar[entityName] = {
        //                 type: "ENTITY",
        //                 name: entityName,
        //                 subTypeOf: subTypeOf,
        //                 props: members
        //             };
        //             mode = "None";
        //             return;
        //         }
        //         var rgSubtypeOf = /\s*SUBTYPE OF\s*\((.*)\)\s*/g
        //         matches = rgSubtypeOf.exec(line);
        //         if (matches) {
        //             subTypeOf = matches[1];
        //         }
        //         if (rgWhere.exec(line)) { bInWhere = true; }
        //         if (!bInWhere) {
        //             // toto : SET [ 1: ?] OF titi
        //             matches = /\s*([a-z0-9_]+)\s*\:\s*SET \[\s*([0-9\?]+)\:\s*([0-9\?]+)\s*\]\s*OF\s*(\w+)/.exec(line);
        //             if (matches) {
        //                 // console.log(" Found Set", matches);
        //             } else {
        //                 matches = /\s*([a-z0-9_]+)\s*\:\s*(\w+)/.exec(line);
        //                 if (matches) {
        //                     name = matches[1];
        //                     type = matches[2];
        //                     members.push({ name: name, type: type });
        //                 }
        //             }
        //         }

        //     } else if (mode == "TYPE") {
        //         if (/END_TYPE/.test(line)) {
        //             // console.log(" toto",index, array[index+2]);
        //             grammar[typeName] = {
        //                 type: "TYPE",
        //                 name: typeName,
        //                 definition: typeDef,
        //             };
        //             mode = "None";
        //             return;
        //         } else {
        //             if (line.indexOf("END_TYPE") >= 0) {
        //                 console.log(" Errror");
        //                 throw new Error("!!!!!!");
        //             }
        //         }
        //     }
        // });
        // // console.log("data",data.toString());
        // resolve(grammar);

        // });

    });

}

exports.readSchema = readSchema;
