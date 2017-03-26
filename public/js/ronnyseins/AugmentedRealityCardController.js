app.controller('ronnyseinsAugmentedRealityCardController', function($scope, $http, $mdDialog, $element, $compile, $mdConstant, $timeout, $translatePartialLoader, $translate, utils) {

    var lngFactor = 100000;
    var latFactor = 100000;
    var markers = [];

    var initMarkers = function() {
        var markerMaterial = new BABYLON.StandardMaterial("markerMaterial", $scope.scene);
        markerMaterial.alpha = 0.5;
        markerMaterial.emissiveColor = new BABYLON.Color3(1.0, 0 ,0 );

        $http.get('/api/markers?fields=_id+lat+lng').then(function (response) {
            response.data.forEach(function(marker) {
                addMarker(marker, markerMaterial);
            });
        });
    };

    var addMarker = function(markerData, markerMaterial) {
        var cylinder = BABYLON.Mesh.CreateCylinder(markerData._id, 2, 1, 0.1, 8, 1, $scope.scene);
        cylinder.material = markerMaterial;
        cylinder.position = new BABYLON.Vector3(-markerData.lng * lngFactor, 1, markerData.lat * latFactor); // (Westen/-Lon, Hoch, Norden/Lat)
        cylinder.originalPosition = new BABYLON.Vector3(-markerData.lng * lngFactor, 1, markerData.lat * latFactor);
        markers.push(cylinder);
    };

    var initBabylon = function() {
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        var canvas = document.getElementById("babylonCanvas");
        if (BABYLON.Engine.isSupported()) {
            var engine = new BABYLON.Engine(canvas, true);
            $scope.scene = new BABYLON.Scene(engine);
            var light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(2, -10, 5), $scope.scene);
            var cameraConstructor = isMobile ? BABYLON.DeviceOrientationCamera : BABYLON.FreeCamera;
            $scope.camera = new cameraConstructor("camera", new BABYLON.Vector3(0, 1.7, 0), $scope.scene);
            $scope.scene.activeCamera = $scope.camera;
            $scope.scene.clearColor = new BABYLON.Color4(0,0,0,0);
            $scope.camera.attachControl(canvas, true);
            /*
            var ground = BABYLON.Mesh.CreateGround("ground", 20, 20, 1, $scope.scene, false);
            var groundMaterial = new BABYLON.StandardMaterial("groundMaterial", $scope.scene);
            groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
            groundMaterial.diffuseTexture = new BABYLON.Texture("css/logo_avorium_komplett.svg", $scope.scene);
            ground.material = groundMaterial;
            */
            engine.runRenderLoop(function () {
                $scope.scene.render();
            });

            window.addEventListener("resize", function () {
                engine.resize();
            });

            initMarkers($scope.scene);
    
            // Try to use current location
            navigator.geolocation.getCurrentPosition(function(position) {
                var x = -position.coords.longitude * lngFactor;
                var z = position.coords.latitude * latFactor;
                //$scope.camera.position = new BABYLON.Vector3(lng, 1.7, lat);
                markers.forEach(function(marker) {
                    marker.position.x = x - marker.originalPosition.x;
                    marker.position.z = z - marker.originalPosition.z;
                });
            });
        }
    };

    var initWebcam = function(videoTag) {
        videoTag.src = '';
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        navigator.mediaDevices.enumerateDevices().then(function(devices) {
            var videoDevice = false;
            devices.forEach(function(device) {
                if (device.kind !== 'videoinput') return;
                videoDevice = device;
            });
            if (!videoDevice) return;
            navigator.getUserMedia({ 
                video: { 
                    optional: [{sourceId:videoDevice.deviceId}],
                    mandatory: { minWidth: 1280, minHeight: 720 }
                }, 
                audio: false 
            }, function(stream) {
                videoTag.src = URL.createObjectURL(stream);
            }, console.log);
        });
    };

    var initFullScreenToggle = function(img) {
        img.addEventListener('click', function() {
            if (img.isFullScreen) {
                document.webkitExitFullscreen();
                img.src = 'css/icons/material/Expand.svg';
            } else {
                img.parentNode.webkitRequestFullscreen();
                img.src = 'css/icons/material/Collapse.svg';
            }
            img.isFullScreen = !img.isFullScreen;
        });
        img.src = 'css/icons/material/Expand.svg';
    }

    initWebcam(document.getElementById('webcamVideo'));
    initFullScreenToggle(document.getElementById('fullscreenToggleImg'));
    initBabylon();

});
