/**
 * API für den zentralen Lizenzserver fm-avorium.de, um per POST eine neue Version vom CI-System
 * hochzuladen, zu installieren und danach neu zu starten
 */
var router = require('express').Router();
var fs = require('fs');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var path = require('path');
var unzip = require('unzip');
var child_process = require('child_process');

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
    // Extract file
    var parser = unzip.Parse();
    parser.on('close', () => {
        // Delete uploaded file
        fs.unlinkSync(filePath);
        // Node-Module installieren
        child_process.exec('npm install', (error, stdout, stderr) => {
            if (error) process.stderr.write(error);
            if (stderr.length > 0) process.stderr.write(stderr);
            if (stdout.length > 0) process.stdout.write(stdout);
        });
        // web.config touchen
        var webConfigFileName = './web.config';
        if (fs.existsSync(webConfigFileName)) {
            var webConfigContent = fs.readFileSync(webConfigFileName);
            fs.writeFileSync(webConfigFileName, webConfigContent);
        }
        return res.sendStatus(200);
    });
    fs.createReadStream(filePath).pipe(parser).on('entry', (entry) => {
        if(entry.type === 'File') {
            var fullPath = path.join(__dirname, '/../', entry.path);
            createPath(path.dirname(fullPath));
            entry.pipe(fs.createWriteStream(fullPath));
        }
    });
});


module.exports = router;
