// var video = document.querySelector('video');

// // var assetURL = 'https://nickdesaulniers.github.io/netfix/demo/frag_bunny.mp4';
// var assetURL = '1.mp4';
// // Need to be specific for Blink regarding codecs
// // ./mp4info frag_bunny.mp4 | grep Codec
// var mimeCodec = 'video/mp4; codecs="avc1.42E01E"';

// if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
//     var mediaSource = new MediaSource();
//     //console.log(mediaSource.readyState); // closed
//     if (video!=null){
//         video.src = URL.createObjectURL(mediaSource);
//     }
//     mediaSource.addEventListener('sourceopen', sourceOpen);
//   } else {
//     console.error('Unsupported MIME type or codec: ', mimeCodec);
//   }
  
//   function sourceOpen (this: any, _: any) {
//     //console.log(this.readyState); // open
//     var mediaSource = this;
//     var sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
//     fetchAB(assetURL, function (buf: any) {
//       sourceBuffer.addEventListener('updateend', function (_: any) {
//         mediaSource.endOfStream();
//         if (video!=null){
//             video.play();
//         }
//         //console.log(mediaSource.readyState); // ended
//       });
//       sourceBuffer.appendBuffer(buf);
//     });
//   };
  
//   function fetchAB (url: any, cb: any) {
//     console.log(url);
//     var xhr = new XMLHttpRequest;
//     xhr.open('get', url);
//     xhr.responseType = 'arraybuffer';
//     xhr.onload = function () {
//       cb(xhr.response);
//       console.log(xhr.response);
//     };
//     xhr.send();
//   };
  
