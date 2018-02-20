var globablBlocklyInit;

app.controller('ronnyseinsBlocklyCardController', function($scope, $http, $mdDialog, $element, $compile, $mdConstant, $timeout, $translate, utils) {
    
    if (!document.globablBlocklyInit) { // Prevent multiple includes of the API
        Blockly.Blocks['api'] = {
            init: function() {
              this.appendDummyInput()
                  .appendField("API name")
                  .appendField(new Blockly.FieldTextInput("activities"), "APINAME");
              this.appendStatementInput("NAME")
                  .setCheck(null)
                  .appendField("routers");
              this.setColour(230);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['api_get'] = {
            init: function() {
              this.appendDummyInput()
                  .appendField("GET /");
              this.appendValueInput("MIDDLEWARES")
                  .setCheck(null)
                  .appendField("Middlewares");
              this.appendStatementInput("STATEMENTS")
                  .setCheck(null);
              this.setPreviousStatement(true, null);
              this.setNextStatement(true, null);
              this.setColour(330);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['auth'] = {
            init: function() {
              this.appendValueInput("AUTH")
                  .setCheck(null)
                  .appendField("Permission")
                  .appendField(new Blockly.FieldDropdown([["Activities","ACTIVITIES"], ["Documents","DOCUMENTS"], ["FM Objects","FMOBJECTS"]]), "PERMISSION")
                  .appendField(new Blockly.FieldDropdown([["Lesen","R"], ["Lesen + Schreiben","W"]]), "READWRITE")
                  .appendField("Modul")
                  .appendField(new Blockly.FieldDropdown([["Activities","ACTIVITIES"], ["Documents","DOCUMENTS"], ["FM Objects","FMOBJECTS"]]), "MODULE");
              this.setOutput(true, null);
              this.setColour(20);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['get_db'] = {
            init: function() {
              this.appendDummyInput()
                  .appendField("get database elements from")
                  .appendField(new Blockly.FieldDropdown([["activities","ACTIVITIES"], ["documents","DOCUMENTS"], ["folders","FOLDERS"]]), "DATABASE");
              this.appendValueInput("NAME")
                  .setCheck(null)
                  .setAlign(Blockly.ALIGN_RIGHT)
                  .appendField("with filter");
              this.setPreviousStatement(true, null);
              this.setNextStatement(true, null);
              this.setColour(120);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['send_response'] = {
            init: function() {
              this.appendDummyInput()
                  .appendField("send to client");
              this.setPreviousStatement(true, null);
              this.setColour(120);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['query_filter'] = {
            init: function() {
              this.appendDummyInput()
                  .appendField("Kombination")
                  .appendField(new Blockly.FieldDropdown([["und","AND"], ["oder","OR"]]), "COMBINATION");
              this.appendStatementInput("PARTS")
                  .setCheck(null);
              this.setOutput(true, null);
              this.setColour(20);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['filter_part_boolean'] = {
            init: function() {
              this.appendDummyInput()
                  .appendField("Fieldname")
                  .appendField(new Blockly.FieldTextInput(""), "FIELD")
                  .appendField("checked")
                  .appendField(new Blockly.FieldCheckbox("TRUE"), "CHECKED");
              this.setPreviousStatement(true, null);
              this.setNextStatement(true, null);
              this.setColour(10);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['filter_part_text'] = {
            init: function() {
              this.appendDummyInput()
                  .appendField("Fieldname")
                  .appendField(new Blockly.FieldTextInput(""), "FIELD")
                  .appendField("value")
                  .appendField(new Blockly.FieldTextInput(""), "VALUE");
              this.setPreviousStatement(true, null);
              this.setNextStatement(true, null);
              this.setColour(10);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['filter_part_var'] = {
            init: function() {
              this.appendValueInput("NAME")
                  .setCheck(null)
                  .appendField("Field")
                  .appendField(new Blockly.FieldTextInput(""), "FIELD")
                  .appendField("must match");
              this.setPreviousStatement(true, null);
              this.setNextStatement(true, null);
              this.setColour(10);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
          
          Blockly.Blocks['var_req_user_id'] = {
            init: function() {
              this.appendDummyInput()
                  .appendField("id of current user");
              this.setOutput(true, null);
              this.setColour(160);
           this.setTooltip("");
           this.setHelpUrl("");
            }
          };
        
          var workspace = Blockly.inject('blocklydiv', {toolbox: document.getElementById('blocklytoolbox')});
        var workspaceBlocks = document.getElementById("blocklylibrary"); 
        Blockly.svgResize(workspace);
    }

});
