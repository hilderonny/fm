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
    catch(e){ }
    setTimeout(captureToCanvas, 500);
}

function setwebcam()
{
    navigator.mediaDevices.enumerateDevices().then(function(devices) {
        var cam = devices.find(function(d) { return d.label.toLowerCase().indexOf("back") >= 0; });
        var options = { deviceId: { exact: cam.deviceId }, facingMode: "environment" };
        navigator.getUserMedia({video: options, audio: false}, function(stream) {
            preview.src = window.URL.createObjectURL(stream);
            setTimeout(captureToCanvas, 500);
        }, function() {});
    });
}

function onqrresult(content) {
    console.log(content);
    document.getElementById("result").innerHTML = content;
}

window.addEventListener("load", function() {
    preview = document.getElementById("preview");
    initCanvas(800, 600);
    qrcode.callback = onqrresult;
    setwebcam();
});