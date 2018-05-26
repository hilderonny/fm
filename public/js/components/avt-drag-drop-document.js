
// Provide drag and drop functionality for local files or URLs into a hierarchy.
// Need to have component avt-hierarchy-card beside.
app.directive('avtDragDropDocument', function($rootScope, $compile, $mdDialog, $translate, $mdToast, utils) { 
    return {
        restrict: "A",
        priority: 950,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].hierarchylist || !element[0].cardcontent) return; // Needs avt-hierarchy-card to work
            element.removeAttr("avt-drag-drop-document");
            // var toolbar = element[0].toolbar;
            // if (toolbar) {
            //     var toolbarbutton = angular.element(toolbarbuttontemplate);
            //     toolbar.append(toolbarbutton);
            // }
            // var tabs = element[0].tabs;
            // if (tabs) {
            //     var tab = angular.element(tabtemplate);
            //     tabs.append(tab);
            // }
            return function link(scope) {
                var highlightlistitem = function(listitem, highlight) {
                    if (!listitem) return;
                    if (highlight) {
                        listitem.classList.add("highlighted");
                    } else {
                        listitem.classList.remove("highlighted");
                    }
                };
                var cardcontent = element[0].cardcontent[0];
                cardcontent.addEventListener("dragover", function(evt) {
                    evt.preventDefault();
                });
                cardcontent.addEventListener("dragenter", function(evt) {
                    evt.preventDefault();
                    var listitem = utils.getparentnode(evt.target, "md-list-item");
                    if (!listitem) return;
                    highlightlistitem(listitem, true);
                });
                cardcontent.addEventListener("dragleave", function(evt) {
                    evt.preventDefault();
                    var listitem = utils.getparentnode(evt.target, "md-list-item");
                    if (!listitem) return;
                    highlightlistitem(listitem, false);
                });
                cardcontent.addEventListener("dragend", function(evt) {
                    console.log("dragend");
                });
                cardcontent.addEventListener("drop", function(evt) {
                    evt.preventDefault();
                    var listitem = utils.getparentnode(evt.target, "md-list-item");
                    highlightlistitem(listitem, false);
                    var child = listitem ? angular.element(listitem).scope().child : false;
                    var parentdatatypename = child ? child.datatypename : null;
                    var parententityname = child ? child.name : null;
                    var dt = evt.dataTransfer;
                    var url = dt.getData("url");
                    if (url) {
                        utils.importfromurl(scope, url, parentdatatypename, parententityname).then(function(documentname) {
                            $translate(['TRK_FOLDERS_DOCUMENT_UPLOADED']).then(function (translations) {
                                $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_DOCUMENT_UPLOADED).hideDelay(1000).position('bottom right'));
                            });
                            utils.setLocation('/documents/' + documentname, true); // Force loading of details card
                        });
                    } else {
                        utils.uploadfile(scope, dt.files[0], parentdatatypename, parententityname).then(function(documentname) {
                            $translate(['TRK_FOLDERS_DOCUMENT_UPLOADED']).then(function (translations) {
                                $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_DOCUMENT_UPLOADED).hideDelay(1000).position('bottom right'));
                            });
                            utils.setLocation('/documents/' + documentname, true); // Force loading of details card
                        });
                    }
                });
                    // scope.canwriterelations = scope.$root.canWrite('PERMISSION_CORE_RELATIONS');
                // scope.canreadrelations = scope.$root.canRead('PERMISSION_CORE_RELATIONS');
            };
        }
    }
});