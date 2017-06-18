var globablInitMap;

app.controller('ronnyseinsGoogleMapsCardController', function($scope, $http, $mdDialog, $element, $compile, $mdConstant, $timeout, $translate, utils) {

    // Needs to be global to give the Maps API access via callback
    globalInitMap = function() {
        $scope.map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: 50.977781, lng: 11.323719},
            zoom: 17
        });
        $scope.map.addListener('click', function(e) {
            $scope.createMarker(e.latLng.lat(), e.latLng.lng() );
        });
        $http.get('/api/markers?fields=_id+lat+lng').then(function(response) {
            response.data.forEach(function(marker) {
                $scope.addMarker(marker);
            });
        });
        $http.get('/api/users?fields=_id+name+lat+lng').then(function(response) {
            response.data.forEach(function(user) {
                if (user.lat && user.lng) {
                    $scope.addUser(user);
                }
            });
        });
        // Try to use current location
        navigator.geolocation.getCurrentPosition(function(position) {
            var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            $scope.map.setCenter(latlng);
            new google.maps.Marker({
                position: latlng,
                map: $scope.map,
                draggable: false,
                icon: 'css/icons/userlocation.png'
            });
        });
    };

    $scope.addMarker = function(markerData) {
        var mapMarker = new google.maps.Marker({
            position: new google.maps.LatLng(markerData.lat, markerData.lng),
            map: $scope.map,
            draggable: false, // TODO
            _id: markerData._id
        });
        mapMarker.addListener('click', function(e) {
            $scope.deleteMarker(mapMarker);
        });
    };

    $scope.addUser = function(userData) {
        var mapMarker = new google.maps.Marker({
            position: new google.maps.LatLng(userData.lat, userData.lng),
            label: userData.name,
            text: userData.name,
            map: $scope.map,
            draggable: false,
            _id: userData._id
        });
    };

    $scope.createMarker = function(lat, lng) {
        var markerToSend = { lat: lat, lng: lng };
        $http.post('/api/markers', markerToSend).then(function(response) {
            $scope.addMarker(response.data);
        });
    };

    $scope.deleteMarker = function(mapMarker) {
        $http.delete('/api/markers/' + mapMarker._id).then(function(response) {
            mapMarker.setMap(null);
            mapMarker = null;
        });
    };
    
    if (document.googleMapsIncluded) { // Prevent multiple includes of the API
        globalInitMap();
    } else {
        var s = document.createElement('script');
        s.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCD3woVExypGPm7Lhaup1XZ0MM04eDNlKo&callback=globalInitMap';
        document.body.appendChild(s);
        document.googleMapsIncluded = true;
    }

});
