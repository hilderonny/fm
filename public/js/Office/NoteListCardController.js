app.controller('OfficeNoteListCardController', function($scope, $rootScope, $http, $mdDialog, $element,$translate, utils){
    
    
    var saveNoteCallback = function(savedNote) {
        $scope.selectedNote.content = savedNote.content;
    };

    var  deleteNoteCallback = function() {
        $scope.notes.splice($scope.notes.indexOf($scope.selectedNote), 1);
        closeNoteCardCallback();
    };   

    var createNoteCallback = function(createdNote) {
        $scope.notes.push(createdNote);
        $scope.selectNote(createdNote);
    };

    var closeNoteCardCallback = function(){
        $scope.selectedNote = false;
        utils.setLocation('/notes');
    };

    $scope.newNote = function(){
        $scope.selectedNote = null;
        utils.removeCardsToTheRightOf($element);  
        utils.addCardWithPermission('Office/NoteCard',{
            createNoteCallback: createNoteCallback,
            closeCallback: closeNoteCardCallback   
        }, 'PERMISSION_OFFICE_NOTE');
    }

    // Click on note in note list shows note details
    $scope.selectNote = function(selectedNote) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Office/NoteCard', {
            noteId: selectedNote._id,
            saveNoteCallback: saveNoteCallback,
            deleteNoteCallback: deleteNoteCallback,
            closeCallback: closeNoteCardCallback   
        }, 'PERMISSION_OFFICE_NOTE').then(function() {
            $scope.selectedNote = selectedNote;
        });
    }

    $scope.load = function() {
        $scope.selectedNote = false;
        $http.get('/api/notes').then(function (response) {        
            $scope.notes = response.data;   
            // Check the permissions for the details page for handling button visibility
            $scope.canWriteNoteDetails = $rootScope.canWrite('PERMISSION_OFFICE_NOTE');
            // Check preselection
            utils.handlePreselection($scope, $scope.notes, $scope.selectNote);
            if (!$scope.params.preselection) utils.setLocation('/notes');
        });
    };

    $scope.load();
});
    
    app.directUrlMappings.notes = {
        mainMenu: 'TRK_MENU_OFFICE',
        subMenu: 'TRK_MENU_OFFICE_NOTES'
    };
    