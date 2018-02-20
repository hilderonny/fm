var globablBlocklyInit;

app.controller('ronnyseinsBlocklyCardController', function($scope, $http, $mdDialog, $element, $compile, $mdConstant, $timeout, $translate, utils) {
    
    if (!document.globablBlocklyInit) { // Prevent multiple includes of the API
        var workspacePlayground = Blockly.inject('blocklydiv', {toolbox: document.getElementById('blocklytoolbox')});
        // var blocklyArea = document.getElementById('blocklyarea');
        // var blocklyDiv = document.getElementById('blocklydiv');
        // var workspacePlayground = Blockly.inject(blocklyDiv, {toolbox: document.getElementById('blocklytoolbox')});
        // var onresize = function(e) {
        //   // Compute the absolute coordinates and dimensions of blocklyArea.
        //   var element = blocklyArea;
        //   var x = 0;
        //   var y = 0;
        //   do {
        //     x += element.offsetLeft;
        //     y += element.offsetTop;
        //     element = element.offsetParent;
        //   } while (element);
        //   // Position blocklyDiv over blocklyArea.
        //   blocklyDiv.style.left = x + 'px';
        //   blocklyDiv.style.top = y + 'px';
        //   blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
        //   blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
        // };
        // window.addEventListener('resize', onresize, false);
        // onresize();
        Blockly.svgResize(workspacePlayground);
    }

});
