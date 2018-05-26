/**
 * API für den zentralen Lizenzserver fm-avorium.de, um per POST eine neue Version vom CI-System
 * hochzuladen, zu installieren und danach neu zu starten
 */
var router = require('express').Router();
var fs = require('fs');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var path = require('path');
var unzip = require('unzip2');
var child_process = require('child_process');
var lc = require('../config/localconfig.json');

var createPath = (pathToCreate) => {
    try {
        fs.statSync(pathToCreate);
        return; // Her we come only when the path exists
    }
    catch (err) {
        // path does not exist, create it
        createPath(path.dirname(pathToCreate));
        fs.mkdirSync(pathToCreate);
    }
}

// Upload a ZIP file containing a new app version
router.post('/', upload.single('file'), function(req, res) {
    var file = req.file;
    var secret = req.body.secret;
    if (secret !== 'hubbele bubbele') {
        return res.sendStatus(401);
    }
    if (!file) {
        return res.sendStatus(400);
    }
    var filePath = path.join(__dirname, '/../', file.path);
    var extractPath = lc.updateExtractPath ? lc.updateExtractPath : './temp/';
    // Extract file
    var parser = unzip.Parse();
    fs.createReadStream(filePath)
        .pipe(parser)
        .on('entry', (entry) => {
            if(entry.type === 'File') {
                var fullPath = path.join(__dirname, '/../', extractPath, entry.path);
                createPath(path.dirname(fullPath));
                entry.pipe(fs.createWriteStream(fullPath));
            }
        })
        .on('error', (error) => {
            return res.sendStatus(400);
        }).on('close', function() {
            // Delete uploaded file
            fs.unlinkSync(filePath);
            // Erst antworten, wenn alles ausgepackt ist
            res.sendStatus(200);
            // Prozess beenden und hoffen, dass er automatisch neu gestartet wird
            process.exit(0);
        });
});


module.exports = router;
