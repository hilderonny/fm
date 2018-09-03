app.directive('avtVrscene', function() { 
    var contenttemplate =
        '<a-scene embedded>' +
        '   <a-entity environment></a-entity>' +
        '   <a-camera mouse-wheel position="0 1.6 0"></a-camera>' +
        '   <a-entity id="rootEntity"></a-entity>' +
        '</a-scene>';
    return {
        restrict: "A",
        priority: 880,
        scope: false,
        compile: function(element) {
            var vrscene = angular.element(contenttemplate);
            element.find("md-card-content").append(vrscene);
            return function(scope) {
                var loadscene = function(dynamicobject) {
                    var rootEntity = document.querySelector("#rootEntity"); // Need to fetch it so, because it is not the same reference as above
                    rootEntity.innerHTML = dynamicobject.content;
                }
                var anothersave = scope.params.onsave;
                scope.params.onsave = function(savedelement) {
                    if (anothersave) anothersave(savedelement);
                    loadscene(savedelement);
                };
                vrscene[0].addEventListener('loaded', function() { loadscene(scope.dynamicobject); });
            }
        }
    }
});