var STEP = require("node-step");
var SCHEMA = require("./readExpressSchema");

SCHEMA.readSchema("IFC2X3_TC1.exp").then((grammar) => {

    console.log(grammar);
    
    var reader = new STEP.StepReader();

    reader.read("1948_IPRO.ifc",function(err) {
         if (err) {
           console.log("failure :" + err);
           return;
         }
         var walls = reader.getObjects("IFCWALL");
         //reader.dumpStatistics();
    
         var types = reader.indexer.types;
         console.log(walls, types);
    
    });

});
