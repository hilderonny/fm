var context2d;
var preview;

function initCanvas(w,h)
{
    var canvas = document.getElementById("qr-canvas");
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w;
    canvas.height = h;
    context2d = canvas.getContext("2d");
    context2d.clearRect(0, 0, w, h);
}


function captureToCanvas() {
    try{
        context2d.drawImage(preview, 0, 0);
        qrcode.decode();
    }
    catch(e){
        console.log(e);
    }
    setTimeout(captureToCanvas, 500);
}

function setwebcam()
{
    navigator.mediaDevices.enumerateDevices().then(function(devices) {
        var cameras = devices.filter(d => d.kind === "videoinput");
        var cam = cameras.find(d => d.label.indexOf("back") >= 0) || cameras[0];
        var options = { deviceId: { exact: cam.deviceId } };
        navigator.getUserMedia({video: options, audio: false}, function(stream) {
            preview.src = window.URL.createObjectURL(stream);
            setTimeout(captureToCanvas, 500);
        }, function() {});
    });
}

function matrixcallback(qRCodeMatrix) {
    context2d.fillStyle = "rgba(255,255,255,1)";
    qRCodeMatrix.points.forEach(function(p) {
        context2d.fillRect(p.x, p.y, 3, 3 );
    });
    console.log(qRCodeMatrix);
}

function onqrresult(content) {
    console.log(content);
    document.getElementById("result").innerHTML = content;
}

window.addEventListener("load", function() {
    preview = document.getElementById("preview");
    initCanvas(800, 600);
    qrcode.matrixcallback = matrixcallback;
    qrcode.callback = onqrresult;
    setwebcam();
});