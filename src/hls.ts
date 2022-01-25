import Hls from "hls.js";
// import jquery from "jquery";

// window.addEventListener("load", (ev) => {
//     console.log("Windows is loaded");
//     console.log(Hls);
//     console.log(jquery);
// })

// var videoList = [
//     'http://52.221.182.132:8888/sg-to-penang/',
//     'http://52.221.182.132:8888/sg-cte/',
//     'http://52.221.182.132:8888/people-fr/',
//     'http://52.221.182.132:8888/ivh-pudo-2/',
//     'http://52.221.182.132:8888/ivh-pudo-1/'
// ]

// videoList.forEach(videoSrc => {
//     var video = document.createElement('video');
//     document.body.appendChild(video);
//     video.width = 320;
//     video.height = 240;
//     video.controls = true;
//     video.muted = true;
//     video.autoplay = true;

//     if (video.canPlayType('application/vnd.apple.mpegurl')) {
//         video.src = videoSrc;
//         video.addEventListener('loadedmetadata',function() {
//             video.play();
//         });
//     } else if (Hls.isSupported()) {
//         var hls = new Hls();
//         hls.loadSource(videoSrc);
//         hls.attachMedia(video);
//         hls.on(Hls.Events.MANIFEST_PARSED,function() {
//             video.play();
//       });
//     }
// });

var video = <HTMLMediaElement> document.getElementById('video');
var videoSrc = 'http://52.221.182.132:8888/ivh-pudo-1/index.m3u8';

//
// First check for native browser HLS support
//
if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = videoSrc;
  video.addEventListener('loadedmetadata',function() {
    video.play();
  });
  //
  // If no native HLS support, check if HLS.js is supported
  //
} else if (Hls.isSupported()) {
  var hls = new Hls();
  hls.loadSource(videoSrc);
  hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED,function() {
    video.play();
});
}
