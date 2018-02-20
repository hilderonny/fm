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





        


          Blockly.JavaScript['api'] = function(block) {
            var text_apiname = block.getFieldValue('APINAME');
            var statements_name = Blockly.JavaScript.statementToCode(block, 'NAME');
            // TODO: Assemble JavaScript into code variable.
            var code = 'Hier kommt der generierte Kot raus.\n';
            return code;
          };
          
          Blockly.JavaScript['api_get'] = function(block) {
            var value_middlewares = Blockly.JavaScript.valueToCode(block, 'MIDDLEWARES', Blockly.JavaScript.ORDER_ATOMIC);
            var statements_statements = Blockly.JavaScript.statementToCode(block, 'STATEMENTS');
            // TODO: Assemble JavaScript into code variable.
            var code = '...;\n';
            return code;
          };
          
          Blockly.JavaScript['auth'] = function(block) {
            var dropdown_permission = block.getFieldValue('PERMISSION');
            var dropdown_readwrite = block.getFieldValue('READWRITE');
            var dropdown_module = block.getFieldValue('MODULE');
            var value_auth = Blockly.JavaScript.valueToCode(block, 'AUTH', Blockly.JavaScript.ORDER_ATOMIC);
            // TODO: Assemble JavaScript into code variable.
            var code = '...';
            // TODO: Change ORDER_NONE to the correct strength.
            return [code, Blockly.JavaScript.ORDER_NONE];
          };
          
          Blockly.JavaScript['get_db'] = function(block) {
            var dropdown_database = block.getFieldValue('DATABASE');
            var value_name = Blockly.JavaScript.valueToCode(block, 'NAME', Blockly.JavaScript.ORDER_ATOMIC);
            // TODO: Assemble JavaScript into code variable.
            var code = '...;\n';
            return code;
          };
          
          Blockly.JavaScript['send_response'] = function(block) {
            // TODO: Assemble JavaScript into code variable.
            var code = '...;\n';
            return code;
          };
          
          Blockly.JavaScript['query_filter'] = function(block) {
            var dropdown_combination = block.getFieldValue('COMBINATION');
            var statements_parts = Blockly.JavaScript.statementToCode(block, 'PARTS');
            // TODO: Assemble JavaScript into code variable.
            var code = '...';
            // TODO: Change ORDER_NONE to the correct strength.
            return [code, Blockly.JavaScript.ORDER_NONE];
          };
          
          Blockly.JavaScript['filter_part_boolean'] = function(block) {
            var text_field = block.getFieldValue('FIELD');
            var checkbox_checked = block.getFieldValue('CHECKED') == 'TRUE';
            // TODO: Assemble JavaScript into code variable.
            var code = '...;\n';
            return code;
          };
          
          Blockly.JavaScript['filter_part_text'] = function(block) {
            var text_field = block.getFieldValue('FIELD');
            var text_value = block.getFieldValue('VALUE');
            // TODO: Assemble JavaScript into code variable.
            var code = '...;\n';
            return code;
          };
          
          Blockly.JavaScript['filter_part_var'] = function(block) {
            var text_field = block.getFieldValue('FIELD');
            var value_name = Blockly.JavaScript.valueToCode(block, 'NAME', Blockly.JavaScript.ORDER_ATOMIC);
            // TODO: Assemble JavaScript into code variable.
            var code = '...;\n';
            return code;
          };
          
          Blockly.JavaScript['var_req_user_id'] = function(block) {
            // TODO: Assemble JavaScript into code variable.
            var code = '...';
            // TODO: Change ORDER_NONE to the correct strength.
            return [code, Blockly.JavaScript.ORDER_NONE];
          };




          var workspace = Blockly.inject('blocklydiv', {toolbox: document.getElementById('blocklytoolbox')});

        function myUpdateFunction(event) {
            var code = Blockly.JavaScript.workspaceToCode(workspace);
            document.getElementById('blocklycode').value = code;
          }
          workspace.addChangeListener(myUpdateFunction);

        Blockly.svgResize(workspace);
    }

});
