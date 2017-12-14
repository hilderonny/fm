app.controller('OfficeNoteCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // Creating new note  
    $scope.createNote = function(){
        var sendnote={
            content: $scope.note.content
        };
        $http.post('/api/notes',sendnote).then(function(response){
            var createdNote = response.data;
            $scope.isNewNote = false;        
            $scope.note._id = createdNote._id;
            $scope.relationsEntity = { type:'notes', id:createdNote._id };
            if ($scope.params.createNoteCallback) {
                $scope.params.createNoteCallback(createdNote);
            }
            $translate(['TRK_NOTES_NOTE_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_NOTES_NOTE_CREATED).hideDelay(1000).position('bottom right'));
            });           
            utils.setLocation('/notes/' + createdNote._id);
        });
    };
    // editing existing note
    $scope.saveNote= function(){
        var sendnote = {
                content: $scope.note.content
        };        
        utils.saveEntity($scope, 'notes', $scope.note._id, '/api/notes/', sendnote).then(function(savedNote) {
            if($scope.params.saveNoteCallback){
                $scope.params.saveNoteCallback(savedNote);
            }
            $translate(['TRK_NOTES_CHANGES_SAVED']).then(function(translations){
                $mdToast.show($mdToast.simple().textContent(translations.TRK_NOTES_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });        
    };
    
    // Deleting existing note
    $scope.deleteNote = function(){
        // confirming the deletion process
        $translate (['TRK_NOTES_NOTE_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations){
            $translate('TRK_NOTES_REALLY_DELETE_NOTE',{content: $scope.note.content}).then(function(TRK_NOTES_REALLY_DELETE_NOTE){
                var confirm = $mdDialog.confirm()
                .title(TRK_NOTES_REALLY_DELETE_NOTE)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function(){
                    $http.delete('/api/notes/'+ $scope.note._id).then(function(response){
                        if ($scope.params.deleteNoteCallback) {
                            $scope.params.deleteNoteCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_NOTES_NOTE_DELETED).hideDelay(1000).position('bottom right'));
                    });
                });
            });
        });
    };

    
    
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }; 

    $scope.load = function() {
        if($scope.params.noteId)
        {
            $scope.isNewNote = false;
            $http.get('/api/notes/'+$scope.params.noteId).then(function(noteResponse) {
                var completeNote = noteResponse.data;
                $scope.isNewNote = false;
                $scope.note = completeNote;    
                $scope.relationsEntity = {type:'notes', id:completeNote._id };
                utils.loadDynamicAttributes($scope, 'notes', $scope.params.noteId);
                utils.setLocation('/notes/' + $scope.params.noteId);
            });
        }else{
            $scope.isNewNote = true;
            $scope.note = {content: "", title: ""};
        }    
        // Check the permissions for the details page for handling button visibility
        $scope.canWriteNoteDetails = $rootScope.canWrite('PERMISSION_OFFICE_NOTE');
    };

    $scope.load();         
      
    });
    
    