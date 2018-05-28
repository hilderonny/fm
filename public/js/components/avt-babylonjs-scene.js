
app.directive('avtBabylonjsScene', function ($compile) {
    var template = '<canvas id="babylonjscanvas" class="fullsize"></canvas>';
    function createDefaultBabylonjsScene(engine) {
        var scene = new BABYLON.Scene(engine);
        var camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(engine.getRenderingCanvas(), true);
        var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene);
        var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), scene);
        var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {}, scene);
        return scene;
    }
    return {
        restrict: "A",
        scope: true,
        compile: function compile(element, attrs) {
            var canvaselement = angular.element(template);
            var resizehandle = element[0].querySelector("resize-handle");
            resizehandle.remove(); // No resizing handle allowed here
            element.append(canvaselement);
            return function link(scope) {
                if (!scope.createBabylonjsScene) scope.createBabylonjsScene = createDefaultBabylonjsScene;
                // See https://doc.babylonjs.com/babylon101/first
                scope.babylonjscanvas = canvaselement[0];
                scope.babylonjsengine = new BABYLON.Engine(scope.babylonjscanvas, true);
                scope.babylonjsscene = scope.createBabylonjsScene(scope.babylonjsengine);
                window.addEventListener("resize", function () {
                    scope.babylonjsengine.resize();
                });
                scope.babylonjsengine.runRenderLoop(function () {
                    scope.babylonjsscene.render();
                });
            }
        }
    };
});