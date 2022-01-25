import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { ffmpeg } from "./ffmpeg";

const wss = new WebSocketServer({
    port: 8182
});
const wsConnList = new Map<number, WebSocket>();
const ffmpegList = new Map<string, ffmpeg>();

/*
 * WebSocket Server
 */
wss.on('connection', (wsClient: WebSocket, request: http.IncomingMessage) => {
    const wsId = Date.now();

    let myffmpeg: ffmpeg;

    wsClient.on('message', (data) => {
        console.log('received %s', data);
    });

    wsClient.on('close', () => {
        wsClient.removeAllListeners();
        if (wsConnList.has(wsId)) {
            console.log("Removed " + wsId);
            wsConnList.delete(wsId);
        }
        ffmpegList.forEach((obj)=>{
            if (obj.wsConnList.has(wsId)){
                obj.wsConnList.delete(wsId);
                obj.wsConnDataRecord.delete(wsId);
            }
        })
    });

    wsConnList.set(wsId, wsClient);
    console.log("Connected " + wsId);

    let url: string = request.url as string;

    let rtspLink: string = Buffer.from(url.substring(1),'base64').toString('utf8');

    console.log(rtspLink);

    if (!ffmpegList.has(rtspLink)){

        myffmpeg = new ffmpeg(rtspLink);
        ffmpegList.set(rtspLink, myffmpeg);
        myffmpeg.wsConnList.set(wsId, wsClient);
        myffmpeg.wsConnDataRecord.set(wsId, 0);
    
        myffmpeg.start();
    
        myffmpeg.sendBufferData()
        
    }
    else if (ffmpegList.has(rtspLink)){
        myffmpeg = ffmpegList.get(rtspLink)!;
        myffmpeg.wsConnList.set(wsId, wsClient);
        myffmpeg.wsConnDataRecord.set(wsId, 0);
    }

});
