app.directive('avtQrScanner', function ($compile, $mdDialog) {
    var toolbartemplate =
        '<md-toolbar avt-toolbar>' +
        '</md-toolbar>';
    var cardcontenttemplate =
        '<md-card-content>' +
        '   <video class="qrpreview" autoplay></video>' +
        '</md-card-content>';
    return {
        restrict: "A",
        scope: false,
        terminal: true,
        priority: 900,
        compile: function compile(element, attrs) {
            // var params = attrs.avtListCard ? JSON.parse(attrs.avtListCard) : {};
            element.removeAttr("avt-qr-scanner");
            var resizehandle = element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].cardcontent = angular.element(cardcontenttemplate);
            element.append(element[0].toolbar);
            element.append(element[0].cardcontent);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                scope.isqrscannerrunning = false;
                scope.start = async () => {
                    if (scope.isqrscannerrunning) return;
                    scope.campreview = element[0].querySelector('video');
                    var stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            advanced: [{ facingMode: "environment" }],
                        }
                    });
                    scope.campreview.srcObject = stream;
                    var canvas = document.createElement('canvas');
                    var context = canvas.getContext("2d");
                    qrcode.callback = function (result) {
                        scope.stop();
                        var confirm = $mdDialog.confirm()
                            .title(result)
                            .ok("Öffnen")
                            .cancel("Schließen");
                        $mdDialog.show(confirm).then(() => {
                            window.open(result, "_blank");
                            scope.start();
                        }, () => {
                            scope.start();
                        });

                    };
                    function scan() {
                        var width = scope.campreview.videoWidth;
                        var height = scope.campreview.videoHeight;
                        canvas.width = width;
                        canvas.height = height;
                        context.drawImage(scope.campreview, 0, 0, width, height);
                        qrcode.canvas_qr2 = canvas;
                        qrcode.qrcontext2 = context;
                        try {
                            qrcode.decode();
                        } catch (error) { }
                        if (scope.isrunning) setTimeout(scan, 250);
                    }
                    scope.isrunning = true;
                    scan();
                };
                scope.stop = () => {
                    if (!scope.campreview) return;
                    scope.isqrscannerrunning = false;
                    if (scope.campreview && scope.campreview.srcObject) scope.campreview.srcObject.getTracks().forEach(track => {
                        track.stop();
                    });
                    scope.campreview.srcObject = null;
                };
                window.addEventListener("focus", scope.start);
                window.addEventListener("blur", scope.stop);
                scope.$on("$destroy", scope.stop);
                $compile(iElement)(scope);
                scope.start();
            };
        }
    }
});