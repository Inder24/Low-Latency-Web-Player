import {spawn} from "child_process";

/*
 * Ffmpeg to stdout
 */

const ffmpeg = spawn("ffmpeg", 
                    ["-i", "rtsp://54.254.197.175:8554/ivh-pudo-1",
                    "-f", "h264",
                    "-acodec", "copy", 
                    "-vcodec", "copy", 
                    "-"]);

ffmpeg.on('exit', function (code, signal) {
    console.log('child process exited with ' +
                `code ${code} and signal ${signal}`);
    });

ffmpeg.stdout.on("data", (data) => {
    console.log("data");
    console.log(data.toString());
});

ffmpeg.stderr.on('data', (data) => {
    console.error(`child stderr:\n${data}`);
  });