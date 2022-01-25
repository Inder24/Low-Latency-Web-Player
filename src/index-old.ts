import { Buffer } from 'buffer';
import { mse } from "./mse";

const socketUrl = 'wss://carman-app-learn-webpack.stva-sg.club/websocket-carman';
const fragmentQueue = Array();
const maxBufferCount = 300;
const loadedDuration = 30;
let streamStart:boolean = false;
let bufferCount:number = 0;

const sleep = (interval: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(null);
        }, interval)
    })
}

const removeBuffer = (video: HTMLMediaElement, sourceBuffer: any, bufferCount: number) => {
    return new Promise((resolve) =>{
        if (bufferCount==maxBufferCount && !sourceBuffer.updating){
            sourceBuffer.remove(0,(video as HTMLMediaElement).buffered.end(0)-loadedDuration);
            bufferCount=0;
        }
        resolve(bufferCount);
    })
}

window.addEventListener('load', (e) => {

    const video = document.querySelector('video');
    
    (video as any).onerror = function(){
        if ((video as any).error!=null){
            console.log("Error " + (video as any).error.code + "; details: " + (video as any).error.message);
        }
    };

    let src: string = (video as HTMLMediaElement).currentSrc;
    const encodeSrc = Buffer.from(src).toString('base64');

    let mimeCodec:string = 'video/mp4; codecs="avc1.4D401F"';

    if ('MediaSource' in window && MediaSource.isTypeSupported(mimeCodec)) {
        let mediaSource:MediaSource = new MediaSource();
        //console.log(mediaSource.readyState); // closed

        (video as HTMLMediaElement).src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener('sourceopen', sourceOpen);

    } else {
        console.error('Unsupported MIME type or codec: ', mimeCodec);
    }





  function sourceOpen (this: any) {
    //console.log(this.readyState); // open
    let mediaSource = this;
    let sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);

    fetchAB(socketUrl, function (buf: any) {
        fragmentQueue.push(buf);
    });

    appendBufferToSource(video as HTMLMediaElement, sourceBuffer, bufferCount, fragmentQueue, streamStart);

    // (async () => {
    //     while (true) {
    //         await sleep(2);
    //         await removeBuffer(video, sourceBuffer, bufferCount).then((value)=>{
    //             bufferCount=value as number;
    //         });
    //         if (fragmentQueue.length>0 && !sourceBuffer.updating) {
    //             const data = fragmentQueue.shift() as any;

    //             const videoData = await data;    

    //             sourceBuffer.appendBuffer(videoData);
    //             bufferCount++;
    //             console.log(bufferCount);

    //             if ((video as any).buffered.length>0 && !streamStart){
    //                 console.log("Video Buffered End Time: " + (video as any).buffered.end(0));
    //                 (video as any).currentTime = (video as any).buffered.end(0);
    //                 console.log("Current Time: " + (video as any).currentTime);
    //                 streamStart=true;
    //             }
    //             else if (streamStart && (video as any)?.buffered.end(0)-(video as any).currentTime>1) {
    //                 console.log((video as any)?.buffered.end(0));
    //                 console.log((video as any).currentTime);
    //                 (video as any).currentTime = (video as any).buffered.end(0);
    //             }
                
    //         }

    //     }

    // })();
  };

    
    function fetchAB (url: any, cb: any) {
        console.log(url);
        const socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        socket.onopen = () => {
            console.log("connected");
        };
        socket.onmessage = (e) => {
            cb(e.data);
        };
        socket.onclose = () => {
            console.log("closed");
        };
        socket.onerror = (e) => {
            console.log(e.type);
        };
    };

    async function appendBufferToSource(videoElement:HTMLMediaElement,sourceBuffer:any, bufferCount:number, fragmentQueue:Array<any>, streamStart:boolean){
        while (true) {
            await sleep(2);
            await removeBuffer(videoElement, sourceBuffer, bufferCount).then((value)=>{
                bufferCount=value as number;
            });
            if (fragmentQueue.length>0 && !sourceBuffer.updating) {
                const data = fragmentQueue.shift() as any;

                const videoData = await data;    

                sourceBuffer.appendBuffer(videoData);
                bufferCount++;

                if ((videoElement as any).buffered.length>0 && !streamStart){
                    // console.log("Video Buffered End Time: " + (videoElement as any).buffered.end(0));
                    (videoElement as any).currentTime = (videoElement as any).buffered.end(0);
                    // console.log("Current Time: " + (videoElement as any).currentTime);
                    streamStart=true;
                }
                else if (streamStart && (videoElement as any)?.buffered.end(0)-(videoElement as any).currentTime>1) {
                    // console.log((videoElement as any)?.buffered.end(0));
                    // console.log((videoElement as any).currentTime);
                    (videoElement as any).currentTime = (videoElement as any).buffered.end(0);
                }
                
            }

        }
    }

}); 

  


