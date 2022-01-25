export class mse {
    videoElement: HTMLMediaElement;
    mimeCodec: string;
    mediaSource:MediaSource;
    streamStart:boolean = false;
    bufferCount:number = 0;
    loadedDuration:number = 30;
    maxBufferCount:number = 600;
    fragmentQueue: Array<any>;
    socketUrl: string;
    
    constructor(videoElement: HTMLMediaElement, mimeCodec: string, socketUrl:string){
        this.videoElement = videoElement;
        this.mimeCodec = mimeCodec;
        this.mediaSource = new MediaSource();
        this.fragmentQueue = Array();
        this.socketUrl = socketUrl;
    }
        
    fetchAB (url: string) {
        const socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        socket.onopen = () => {
            console.log("connected");
        };
        socket.onmessage = (e) => {
            this.fragmentQueue.push(e.data);
        };
        socket.onclose = () => {
            console.log("closed");
        };
        socket.onerror = (e) => {
            console.log(e.type);
        };
    };

    async appendBufferToSource(sourceBuffer:any){
        while (true) {
            await this.sleep(2);
            await this.removeBuffer(sourceBuffer, this.bufferCount).then((value)=>{
                this.bufferCount=value as number;
            });
            if (this.fragmentQueue.length>0 && !sourceBuffer.updating) {
                const data = this.fragmentQueue.shift() as any;

                const videoData = await data;    

                sourceBuffer.appendBuffer(videoData);
                this.bufferCount++;

                if (this.videoElement.buffered.length>0 && !this.streamStart){
                    console.log("Video Buffered End Time: " + this.videoElement.buffered.end(0));
                    this.videoElement.currentTime = this.videoElement.buffered.end(0);
                    console.log("Current Time: " + this.videoElement.currentTime);
                    this.streamStart=true;
                }
                else if (this.streamStart && this.videoElement.buffered.end(0)-this.videoElement.currentTime>0.6) {
                    console.log(this.videoElement.buffered.end(0));
                    console.log(this.videoElement.currentTime);
                    this.videoElement.currentTime = this.videoElement.buffered.end(0);
                }
                
            }

        }
    }

    removeBuffer(sourceBuffer: any, bufferCount: number){
        return new Promise((resolve) =>{
            if (bufferCount==this.maxBufferCount && !sourceBuffer.updating){
                sourceBuffer.remove(0,this.videoElement.buffered.end(0)-this.loadedDuration);
                bufferCount=0;
            }
            resolve(bufferCount);
        })
    }

    sleep(interval: number){
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(null);
            }, interval)
        })
    }

}