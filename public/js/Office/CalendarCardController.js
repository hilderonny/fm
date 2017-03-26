app.controller('OfficeCalendarCardController', function($scope, $http, $mdDialog, $element, $compile, $mdConstant, $timeout, $translatePartialLoader, $translate, utils) {
    
    // Register translations
    utils.registerTranslations('activities');
    
    // Event callbacks
    var saveActivityCallback = function(savedActivity) {
        $scope.selectedActivity.name = savedActivity.name;
        $scope.selectedActivity.date = savedActivity.date;
        $scope.selectedActivity.type = savedActivity.type;
        $scope.selectedActivity.isDone = savedActivity.isDone;
    };
    var deleteActivityCallback = function() {
        for (var i = 0; i < $scope.activityListActivities.length; i++) {
            var activity = $scope.activityListActivities[i];
            if (activity._id === $scope.selectedActivity._id) {
                $scope.activityListActivities.splice(i, 1);
                $scope.selectedActivity = false;
                break;
            }
        }
    };
    var createActivityCallback = function(createdActivity) {
        $scope.activityListActivities.push(createdActivity);
        $scope.selectedActivity = createdActivity;
    };
    var closeActivityCardCallback = function() {
        $scope.selectedActivity = false;
    };

    // Calculate some edge dates for filtering in CalendarCard.html
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var tomorrow = new Date(today); // http://stackoverflow.com/a/19691491
    tomorrow.setDate(tomorrow.getDate() + 1);
    var monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() - 1) % 7));
    var nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    var firstInMonth = new Date(today);
    firstInMonth.setDate(1);
    var firstInNextMonth = new Date(today);
    firstInNextMonth.setDate(28);
    while(firstInNextMonth.getMonth() === today.getMonth()) {
        firstInNextMonth.setDate(firstInNextMonth.getDate() + 1);
    }
    var after7Days = new Date(today);
    after7Days.setDate(after7Days.getDate() + 7);
    var after30Days = new Date(today);
    after30Days.setDate(after30Days.getDate() + 30);
    $scope.today = today.toISOString();
    $scope.tomorrow = tomorrow.toISOString();
    $scope.monday = monday.toISOString();
    $scope.nextMonday = nextMonday.toISOString();
    $scope.firstInMonth = firstInMonth.toISOString();
    $scope.firstInNextMonth = firstInNextMonth.toISOString();
    $scope.after7Days = after7Days.toISOString();
    $scope.after30Days = after30Days.toISOString();

    // Click on activity in user list shows activity details
    $scope.selectActivity = function(selectedActivity) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Office/ActivityCard', {
            activityId: selectedActivity._id,
            saveActivityCallback: saveActivityCallback,
            deleteActivityCallback: deleteActivityCallback,
            closeCallback: closeActivityCardCallback,
            isSelection: $scope.params.isSelection,
            selectButtonText: $scope.params.selectButtonText,
            selectCallback: $scope.params.selectCallback
        });
        $scope.selectedActivity = selectedActivity;
    }

    // Click on new activity button opens detail dialog with new activity data
    $scope.newActivity = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Office/ActivityCard', {
            createActivityCallback: createActivityCallback,
            saveActivityCallback: saveActivityCallback,
            deleteActivityCallback: deleteActivityCallback,
            closeCallback: closeActivityCardCallback,
            isSelection: $scope.params.isSelection,
            selectButtonText: $scope.params.selectButtonText,
            selectCallback: $scope.params.selectCallback
        });
    }

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };
   
    // Parameters:
    // - $scope.params.isSelection : When true, the card will not edit activities but show a select button and call the selectCallback when clicked
    // - $scope.params.selectButtonText : The translation key text for the select button when isSelection = true
    // - $scope.params.selectCallback : The callback to be called when the select button was pressed (when isSelection = true)
    $scope.load = function() {
        // Load activities
        $http.get('api/activities').then(function(response) {
            $scope.activityListActivities = response.data;
        });
        $http.get('/api/permissions/canWrite/PERMISSION_OFFICE_ACTIVITY').then(function (response) {
            $scope.canWriteActivities = response.data;
        });
    }

    $scope.load();

});

// Special controller for defining list parameters for overdue list
app.controller('OfficeCalendarCardOverDueController', function($scope) {
    $scope.activityListFilter = function(activity) {
        return activity.date < $scope.today;
    };
    $scope.activityListShowName = true;
    $scope.activityListShowType = true;
    $scope.activityListShowDate = true;
});

// Special controller for defining list parameters for today list
app.controller('OfficeCalendarCardTodayController', function($scope) {
    $scope.activityListFilter = function(activity) {
        return activity.date >= $scope.today && activity.date < $scope.tomorrow;
    };
    $scope.activityListShowName = true;
    $scope.activityListShowType = true;
    $scope.activityListShowDate = false;
});

// Special controller for defining list parameters for today list
app.controller('OfficeCalendarCardThisWeekController', function($scope) {
    $scope.activityListFilter = function(activity) {
        return activity.date >= $scope.monday && activity.date < $scope.nextMonday;
    };
    $scope.activityListShowName = true;
    $scope.activityListShowType = true;
    $scope.activityListShowDate = true;
});

// Special controller for defining list parameters for today list
app.controller('OfficeCalendarCardThisMonthController', function($scope) {
    $scope.activityListFilter = function(activity) {
        return activity.date >= $scope.firstInMonth && activity.date < $scope.firstInNextMonth;
    };
    $scope.activityListShowName = true;
    $scope.activityListShowType = true;
    $scope.activityListShowDate = true;
});

// Special controller for defining list parameters for today list
app.controller('OfficeCalendarCardNext7DaysController', function($scope) {
    $scope.activityListFilter = function(activity) {
        return activity.date >= $scope.today && activity.date < $scope.after7Days;
    };
    $scope.activityListShowName = true;
    $scope.activityListShowType = true;
    $scope.activityListShowDate = true;
});

// Special controller for defining list parameters for today list
app.controller('OfficeCalendarCardNext30DaysController', function($scope) {
    $scope.activityListFilter = function(activity) {
        return activity.date >= $scope.today && activity.date < $scope.after30Days;
    };
    $scope.activityListShowName = true;
    $scope.activityListShowType = true;
    $scope.activityListShowDate = true;
});
