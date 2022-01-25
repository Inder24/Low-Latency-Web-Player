import WebSocket, {WebSocketServer} from "ws";
import Util from "util";
import {spawn} from "child_process";

const sleep = Util.promisify(setTimeout);
const fragmentQueue = Array();
const wss = new WebSocketServer({
    port: 8182,
});
const wsConnList = new Map<number, WebSocket>();
const wsNewConn = new Map<number, number>();
let ftyp = null;
let moov = null;
let moof = null;

/*
 * Controller
 */
(async () => {
    while (true) {
        while (fragmentQueue.length>0) {
            /*
             * Get a fragment item
             */
            const data = fragmentQueue.shift();

            /*
             * Send data to all connected websocket clients
             */
            let packet = new Uint8Array(data);
            let res = getBox(packet, 0);
            let main_length = res[0]; let name = res[1];

            if (name=="ftyp") {
                /*
                 * Save initial fragment
                 */
                console.log("got ftyp");
                ftyp=data;
            }
            else if (name=="moov") {
                console.log("got moov");
                moov=data;
            } 

            for (let [key, wsConn] of wsConnList) {
                // if ([0,1,2].includes(wsNewConn.get(key) as number)){
                //     let packet = new Uint8Array(data);
                //     let res = getBox(packet, 0);
                //     let name = res[1];
        
                //     if (name=="ftyp") {
                //         console.log("got ftyp");
                //         ftyp=data;
                //     }
                //     else if (name=="moov") {
                //         console.log("got moov");
                //         moov=data;
                //     }
                //     else if (name=="moof" && hasFirstSampleFlag(packet)){ 
                //         console.log("got moof");
                //         moof=data;
                //     }
                // }
                /*
                 * Send initial fragment then special moof fragment for newly connected websocket client
                 */    
                if (wsNewConn.get(key)==0){
                    if (ftyp!=null){
                        wsConn.send(ftyp);
                        wsNewConn.set(key, 1);
                    }                
                }
                else if (wsNewConn.get(key)==1){
                    if (moov!=null){
                        wsConn.send(moov);
                    }
                    wsNewConn.set(key, 2);
                }
                else if (wsNewConn.get(key)==2){
                    if (name=="moof" && hasFirstSampleFlag(packet)){ 
                        console.log("got moof");
                        wsConn.send(data);
                        wsNewConn.set(key, 3);
                    }
                    // if (moof!=null){
                    //     wsConn.send(moof);
                    //     wsNewConn.set(key, 3);
                    //     moof=null;
                    // }

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
})();

/*
 * WebSocket Server
 */
wss.on('connection', (wsClient) => {
    const wsId = Date.now();

    wsClient.on('message', (data) => {
        console.log('received %s', data);
    });

    wsClient.on('close', () => {
        wsClient.removeAllListeners();
        if (wsConnList.has(wsId)) {
            console.log("Removed " + wsId);
            wsConnList.delete(wsId);
            wsNewConn.delete(wsId);
        }
    });

    wsConnList.set(wsId, wsClient);
    wsNewConn.set(wsId, 0);
    console.log("Connected " + wsId);
});

/*
 * Ffmpeg to stdout
 */
const ffmpeg = spawn("ffmpeg", 
                    ["-c:v", "h264",                                             //Tell FFmpeg that input stream codec is h264
                    "-i", "rtsp://13.229.71.182:8554/ivh-pudo-1",                //Read stream from rtsp
                    // "-i", "rtsp://10.0.43.109:8085/h264_ulaw.sdp",
                    "-c:v", "copy",                                              //Tell FFmpeg to copy the video stream as is (without decoding and encoding)                                                               
                    "-an",                                                       //No audio
                    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
                    "-frag_duration", "300000",                                  //Create fragments that are duration microseconds long
                    "-f", "mp4",                                                 //Define pipe format to be mp4
                    "-"]);                                                       //Output is a pipe


// const ffprobe = spawn("ffprobe",
//                     ["-v", "quiet",
//                     "-show_entries", "stream=codec_name",
//                     "-of", "default=nokey=1:noprint_wrappers=1",
//                     "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h265/360/Big_Buck_Bunny_360_10s_1MB.mp4"
//                     ]);

// const ffprobe = spawn("ffmpeg",
//                     ["-i", "./dist/1.mp4",
//                     "-f", "null",
//                     "-"
//                     ]);

// ffprobe.stdout.on("data", (data) => {
//     console.log(data.toString());
// });

// ffprobe.stderr.on('data', (data) => {
//     console.error(`child stderr:\n${data}`);
//   });

// ffprobe.on('exit', function (code, signal) {
//     console.log('child process exited with ' +
//                 `code ${code} and signal ${signal}`);
//   });

// ffprobe -v quiet -show_entries stream=codec_name -of default=nokey=1:noprint_wrappers=1 rtsp://13.229.71.182:8554/ivh-pudo-1
// ffmpeg -i ./dist/1.mp4 -f null -

// const ffmpeg2 = spawn("ffmpeg", 
//                     ["-i", "rtsp://13.229.71.182:8554/ivh-pudo-1",
//                     "-i", "rtsp://13.229.71.182:8554/ivh-pudo-2",
//                     "-movflags", "frag_keyframe+empty_moov+default_base_moof",
//                     "-frag_duration", "300000", 
//                     "-filter_complex", "vstack=inputs=2",
//                     "-f", "mp4",
//                     "-"]);

/*
 * Read from stdout
 */
ffmpeg.stdout.on("data", (data) => {
    fragmentQueue.push(data.buffer);
    console.log(data.buffer);
});

// ffmpeg.stderr.on('data', (data) => {
//     console.error(`child stderr:\n${data}`);
// });

/*
 * Get ftyp, moov, moof box
 */

function toInt(arr:any, index:number) { // From bytes to big-endian 32-bit integer.  Input: Uint8Array, index
    let dv = new DataView(arr.buffer, 0);
    return dv.getInt32(index, false); // big endian
}

function toString(arr:any, fr:number, to:number) { // From bytes to string.  Input: Uint8Array, start index, stop index.
    return String.fromCharCode.apply(null, arr.slice(fr,to));
}

function getBox(arr:any, i:number) { // input Uint8Array, start index
    return [toInt(arr, i), toString(arr, i+4, i+8)]
}

function getSubBox(arr:any, box_name:any) { // input Uint8Array, box name
    let i = 0;
    let res = getBox(arr, i);
    let main_length = res[0]; let name = res[1]; // this boxes length and name
    i = i + 8;

    let sub_box = null;

    while (i < main_length) {
        res = getBox(arr, i);
        let l = res[0]; name = res[1];

        if (box_name == name) {
            sub_box = arr.slice(i, i+Number(l))
        }
        i = i + Number(l);
    }
    return sub_box;
}

function hasFirstSampleFlag(arr: any) { // input Uint8Array
    // [moof [mfhd] [traf [tfhd] [tfdt] [trun]]]

    let traf = getSubBox(arr, "traf");
    if (traf==null) { return false; }

    let trun = getSubBox(traf, "trun");
    if (trun==null) { return false; }

    // ISO/IEC 14496-12:2012(E) .. pages 5 and 57
    // bytes: (size 4), (name 4), (version 1 + tr_flags 3)
    let flags = trun.slice(10,13); // console.log(flags);
    let f = flags[1] & 4; // console.log(f);
    return f == 4;
}

