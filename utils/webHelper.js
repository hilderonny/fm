var request = require('request');

/**
 * Uploads a file to a foreign host.
 * Ignores unsecure HTTPS connections.
 * Dieses Modul ist nur beim Bauen und Testen verfügbar und wird nicht deployed.
 * Usage: require('../utils/webHelper').postFileToUrl('http://example.com/dingsda', 'myfile.txt', 'Hello World this is my file content, can also be a Buffer', {formproperty:'value'}, 900000);
 * @returns Promise containing the post response
 */
module.exports.postFileToUrl = (url, fileName, fileContent, formProperties, timeout) => {
    return new Promise(function(resolve, reject) {
        var options = { url: url };
        if (timeout) options.timeout = timeout;
        var oldTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        var req = request.post(options, function(error, response, body) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = oldTlsSetting;
            if (error) return reject(error);
            resolve(response);
        });
        var form = req.form();
        form.append('file', fileContent, { filename: fileName });
        if (formProperties) Object.keys(formProperties).forEach(function(key) {
            form.append(key, formProperties[key]);
        });
    });
};