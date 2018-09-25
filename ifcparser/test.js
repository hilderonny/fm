var schemaparser = require('./expressSchemaParser');
var ifcParser = require('./ifcParser');

async function schemaTest() {
    var schema = await schemaparser.readSchema('./IFC4.exp');
    console.log(JSON.stringify(schema, null, 4));
    console.log(Object.keys(schema.types).length, Object.keys(schema.entities).length);
}

async function ifcTest() {
    var entities = await ifcParser.readIfcFile('./1948_IPRO.ifc');
    console.log('number of entities: ', Object.keys(entities.byId).length);
    Object.keys(entities.byName).sort((a, b) => a.localeCompare(b)).forEach((name) => {
        console.log(name, entities.byName[name].length);
    });
}

ifcTest();
