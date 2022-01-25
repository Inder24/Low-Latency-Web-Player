import fs from "fs";
import WebSocket, {WebSocketServer} from "ws";
import { spawn } from "child_process";
import FIFO from "fifo";
import Util from "util";

const sleep = Util.promisify(setTimeout);
const fragmentQueue = FIFO<any>();
const wss = new WebSocketServer({
    port: 8182
});
const wsConnList = new Map<number, WebSocket>();
let hdrMoov: ArrayBuffer;

/*
 * Controller
 */
(async () => {
    while (true) {
        while (fragmentQueue.length > 0) {
            /*
             * Get a fragment item
             */
            const data: any = fragmentQueue.shift();

            /*
             * Send data to all connected websocket clients
             */
            for (let [key, wsConn] of wsConnList) {
                wsConn.send(data);
            }
            /*
             * Momentarily give up control so that other async fns can 
             * have a chance to do their work
             */
            await sleep(10);
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

    wsClient.send(new Uint8Array(hdrMoov));
    wsClient.on('message', (data) => {
        console.log('received %s', data);
    });

    wsClient.on('close', () => {
        wsClient.removeAllListeners();
        if (wsConnList.has(wsId)) {
            console.log("Removed " + wsId);
            wsConnList.delete(wsId);
        }
    });

    wsConnList.set(wsId, wsClient);
    console.log("Connected " + wsId);
});

/*
 * Mp4Box
 */
const Mp4Box = require('mp4box');
const mp4BoxFile = Mp4Box.createFile();

mp4BoxFile.onMoovStart = () => {
    console.log("xxxxxxxx onMoovStart xxxxxxxx");
}

mp4BoxFile.onReady = (info: any) => {
    console.log(info);

    mp4BoxFile.onSegment = (id: any, user: any, buffer: any, sampleNumber: any, last: any) => {
        const mimeType = info.mime;
        const fullBuffer = new Uint8Array(hdrMoov.byteLength + buffer.byteLength)

        // fullBuffer.set(new Uint8Array(hdrMoov), 0);
        // fullBuffer.set(new Uint8Array(buffer), hdrMoov.byteLength);
        // fragmentQueue.push(new Uint8Array(fullBuffer));
        fragmentQueue.push(new Uint8Array(buffer));
    }

    mp4BoxFile.setSegmentOptions(info.tracks[0].id, null, {
        nbSamples: 90
    });

    mp4BoxFile.initializeSegmentation();

    mp4BoxFile.start();
};
mp4BoxFile.onError = (e: Error) => {
    console.log("Error");
    console.error(e);
}

/*
 * FFMpeg
 */
let procFfmpeg;
(async () => {
    const rtspStream = "rtsp://54.254.197.175:8554/ivh-pudo-1";
    procFfmpeg = spawn("ffmpeg", [
        // "rtsp_transport", "tcp",
        "-i", rtspStream,
        "-c:v", "copy",
        "-an",
        "-f", "mp4",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "-frag_duration", "1000000",
        // "-reset_timestamps", "1",
        // "-analyzeduration", "0",
        // "-fflags", "nobuffer+discardcorrupt",
        // "-flags", "low_delay",
        // "-max_delay", "0.5",
        // "-probesize", "10240",
        // "-max_probe_packets", "1",
        // "-packetsize", "10240",
        // "-flush_packets", "1",
        "-"
    ]);
    
    let count = 0;
    let fileStart = 0;
    procFfmpeg.stdout.on("data", (chunk) => {
        const chunkBuffer = chunk.buffer;

        console.log(count++);

        if (fileStart === 0) {
            hdrMoov = chunkBuffer;
        }

        chunkBuffer.fileStart = fileStart;
        mp4BoxFile.appendBuffer(chunkBuffer);
        fileStart += chunk.length;
    });
   
})();


/*
 * Logger
 */
(async () => {
    (procFfmpeg as any)?.stderr.on("data", (chunk: string) => {
        fs.writeSync(2, chunk);
    });
    
})()


/*
ffmpeg -i rtsp://54.254.197.175:8554/ivh-pudo-1 -c copy  -f mp4 -movflags frag_keyframe+default_base_moof -reset_timestamps 1 -frag_duration 70000 - | ts-node pipe-to-websocket.ts
ffmpeg -i rtsp://54.254.197.175:8554/ivh-pudo-1 -c copy  -f mp4 -movflags frag_keyframe+empty_moof -reset_timestamps 1  - | ts-node pipe-to-websocket.ts
ffmpeg -i rtsp://54.254.197.175:8554/ivh-pudo-1 -c copy -hls_segment_type fmp4 -hls_time 10 -to 60 chunks/video.m3u8
ffmpeg -i rtsp://54.254.197.175:8554/ivh-pudo-1 -c:v copy -an -f mp4 -movflags frag_keyframe+empty_moov -frag_duration 0.1 - | ts-node pipe-to-websocket.ts

*/