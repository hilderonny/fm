const readline = require('readline');
const fs = require('fs');

// RegExp tester: https://regexr.com/

function trim(str) { return str.replace(/^\s+/g, '').replace(/\s+$/g, ''); }

function readIfcFile(filename) {
    
    return new Promise((resolve, reject) => {

        var entities = { byId:{}, byName: {} };
    
        readline.createInterface({
            input: fs.createReadStream(filename),
            crlfDelay: Infinity
        }).on('line', (line) => {
            line = trim(line);
            var match = (/^\#([0-9]+)\=\s*([a-zA-Z_]+)*/g).exec(line);
            if (!match) return;
            var entity = {
                id: match[1],
                name: match[2],
                def:  match.input.substr(match[0].length)
            };
            entities.byId[entity.id] = entity;
            if (!entities.byName[entity.name]) entities.byName[entity.name] = [];
            entities.byName[entity.name].push(entity);
        }).on('close', () => {
            resolve(entities);
        });

    });

}

exports.readIfcFile = readIfcFile;
