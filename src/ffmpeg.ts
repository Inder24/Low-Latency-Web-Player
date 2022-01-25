import { spawn } from "child_process";
import Util from "util";
import WebSocket from "ws";

export class ffmpeg {
    rtspLink: string;
    fragmentQueue: Array<any>;
    frag_duration: string = "100000";
    wsConnList: Map<number, WebSocket>;
    wsConnDataRecord: Map<number, number>;
    ftyp: any = null;
    moov: any = null;
    moof: any = null;

    constructor(rtspLink: string) {
        this.rtspLink = rtspLink;
        this.fragmentQueue = Array();
        this.wsConnList = new Map<number, WebSocket>();
        this.wsConnDataRecord = new Map<number, number>();
      }

    start() {
        const childProcess = spawn("ffmpeg", 
        ["-i", this.rtspLink,                                        //Read stream from rtsp
        "-c:v", "copy",                                              //Tell FFmpeg to copy the video stream as is (without decoding and encoding)                                                               
        "-an",                                                       //No audio
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "-frag_duration", this.frag_duration,                        //Create fragments that are duration microseconds long
        "-fflags", "nobuffer",
        "-tune", "zerolatency",
        "-f", "mp4",                                                 //Define pipe format to be mp4
        "-"]);                                                       //Output is a pipe

        childProcess.stdout.on("data", (data) => {
            this.fragmentQueue.push(data.buffer);
            this.saveInitialFragment(data.buffer);
        });

        // childProcess.stderr.on('data', (data) => {
        //     console.error(`child stderr:\n${data}`);
        // });

      }


    async sendBufferData(){
        const sleep = Util.promisify(setTimeout);
        while (true) {
            while (this.fragmentQueue.length>0) {
                /*
                * Get a fragment item
                */
                const data = this.fragmentQueue.shift();

                /*
                * Send data to all connected websocket clients
                */
                for (let [key, wsConn] of this.wsConnList) {
                    /*
                    * Send initial fragment then special moof fragment for newly connected websocket client
                    */    
                    if (this.wsConnDataRecord.get(key)==0){
                        if (this.ftyp!=null){
                            wsConn.send(this.ftyp);
                            this.wsConnDataRecord.set(key, 1);
                        }                
                    }
                    else if (this.wsConnDataRecord.get(key)==1){
                        if (this.moov!=null){
                            wsConn.send(this.moov);
                        }
                        this.wsConnDataRecord.set(key, 2);
                    }
                    else if (this.wsConnDataRecord.get(key)==2){
                        if (this.getNameOfBox(data)=="moof" && this.hasFirstSampleFlag(new Uint8Array(data))){ 
                            console.log("got special moof");
                            wsConn.send(data);
                            this.wsConnDataRecord.set(key, 3);
                        }
                    }
                    /*
                    * Send fragment for already connected websocket client
                    */ 
                    else {
                        wsConn.send(data);
                    }
                }

                /*
                * Momentarily give up control so that other async fns can 
                * have a chance to do their work
                */
                await sleep(1);
            }
            /*
            * Pause for a longer time to wait for fragmentQueue to fill up
            */
            await sleep(100);
        }
    }

    saveInitialFragment(data: any){
        if (this.moof==null){
            if (this.getNameOfBox(data)=="ftyp") {
                console.log("got ftyp");
                this.ftyp=data;
            }
            else if (this.getNameOfBox(data)=="moov") {
                console.log("got moov");
                this.moov=data;
            }
            else if (this.getNameOfBox(data)=="moof") {
                console.log("got moof");
                this.moof=data;
            }
        }
    }

    /*
    * Get ftyp, moov, moof box
    */

    getNameOfBox(data:any){
        try {
            let packet = new Uint8Array(data);
            let res = this.getBox(packet, 0);
            return res[1];
        }
        catch (e){
            console.log(e);
            return null;
        }
    }

    toInt(arr:any, index:number) { // From bytes to big-endian 32-bit integer.  Input: Uint8Array, index
        let dv = new DataView(arr.buffer, 0);
        return dv.getInt32(index, false); // big endian
    }

    bytesToString(arr:any, fr:number, to:number) { // From bytes to string.  Input: Uint8Array, start index, stop index.
        return String.fromCharCode.apply(null, arr.slice(fr,to));
    }

    getBox(arr:any, i:number) { // input Uint8Array, start index
        return [this.toInt(arr, i), this.bytesToString(arr, i+4, i+8)]
    }

    getSubBox(arr:any, box_name:any) { // input Uint8Array, box name
        let i = 0;
        let res = this.getBox(arr, i);
        let main_length = res[0]; let name = res[1]; // this boxes length and name
        i = i + 8;

        let sub_box = null;

        while (i < main_length) {
            res = this.getBox(arr, i);
            let l = res[0]; name = res[1];

            if (box_name == name) {
                sub_box = arr.slice(i, i+Number(l))
            }
            i = i + Number(l);
        }
        return sub_box;
    }

    hasFirstSampleFlag(arr: any) { // input Uint8Array
        // [moof [mfhd] [traf [tfhd] [tfdt] [trun]]]

        let traf = this.getSubBox(arr, "traf");
        if (traf==null) { return false; }

        let trun = this.getSubBox(traf, "trun");
        if (trun==null) { return false; }

        // ISO/IEC 14496-12:2012(E) .. pages 5 and 57
        // bytes: (size 4), (name 4), (version 1 + tr_flags 3)
        let flags = trun.slice(10,13); // console.log(flags);
        let f = flags[1] & 4; // console.log(f);
        return f == 4;
    }


}