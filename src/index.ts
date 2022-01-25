import { Buffer } from 'buffer';
import { mse } from "./mse";

const socketUrl = 'ws://10.0.43.133:8182';

window.addEventListener('load', (e) => {

    const videoTag = document.querySelectorAll('video');

    videoTag.forEach((videoElement)=>{

        videoElement.onerror = function(){
            if (videoElement.error!=null){
                console.log("Error " + videoElement.error.code + "; details: " + videoElement.error.message);
            }
        };

        let src: string = (videoElement as HTMLMediaElement).currentSrc;
        let encodeSrc = Buffer.from(src).toString('base64');

        let mimeCodec:string;

        if (src=="rtsp://admin:admin6388@10.0.43.154/" || src=="rtsp://10.0.43.116:8080/h264_ulaw.sdp"){
            mimeCodec='video/mp4; codecs="avc1.4D401F"';
        } else {
            mimeCodec='video/mp4; codecs="hev1.1.6.L123.b0"';
        }

        let myMse = new mse(videoElement as HTMLMediaElement, mimeCodec, socketUrl + "/" + encodeSrc);

        if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
    
            myMse.videoElement.src = URL.createObjectURL(myMse.mediaSource);
            myMse.mediaSource.addEventListener('sourceopen', sourceOpen);
    
        } else {
            console.error('Unsupported MIME type or codec: ', mimeCodec);
        }

        function sourceOpen (this: any) {
            let mediaSource = this;
            let sourceBuffer = mediaSource.addSourceBuffer(myMse.mimeCodec);
        
            myMse.fetchAB(myMse.socketUrl);
            myMse.appendBufferToSource(sourceBuffer);
          };

    });

}); 



  


