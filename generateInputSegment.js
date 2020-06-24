const AWS = require('aws-sdk');
const moment = require('moment');
const { spawn } = require('child_process');
const s3 = new AWS.S3();

console.log('Loading function');

exports.handler = async(event, context) => {
    const fileName = event.fileName;
    const bucket = event.bucket;
    const segmentInput = await prepareInputData(fileName, bucket);
    const response = {
        segmentInput
    }
    
    return response;
};

const prepareInputData = async(fileName, bucket) => {
    return new Promise(async(res, rej) => {
        const segmentNumber = await getSegmentNumber(fileName, bucket);

        const segmentInformation = [];
        let startPosition = 0
        for (let i = 0; i < segmentNumber; i++) {
            segmentInformation.push({
                "index": i,
                "output_file_name": `output${i}.ts`,
                "start_position": startPosition,
                "file_name": fileName,
                "bucket": bucket
            });
            startPosition += 5;
        }
        res(segmentInformation);
    })

}


const getSegmentNumber = (fileName, bucket) => {
    return new Promise((res, rej) => {
        const params = {
            Bucket: bucket,
            Key: fileName
        }

        const signedURL = s3.getSignedUrl('getObject', params);

        console.log(signedURL);
        const ffprobeOutput = [];
        const data = spawn('./ffmpeg-bin/ffprobe', [signedURL]);

        data.stderr.on('data', data => ffprobeOutput.push(data.toString()));

        data.stderr.on('close', () => {
            //Im shit at regex, not sure if this can be done better bascically matches
            //"Duration: the HH:MM:SS.MS" with milliseconds being an optional match
            const regex = /Duration: [0-9][0-9]:[0-9][0-9]:[0-9][0-0](.[0-9][0-9])?/g;
            const durationIndex = ffprobeOutput.filter(output => output.includes("Duration"))[0];
            console.log(ffprobeOutput);
            let durationOutput = durationIndex.match(regex);
            if (!durationOutput) {
                console.log("Duration could not be found");
                return;
            }

            const timeCode = durationOutput[0].split(' ')[1];
            const seconds = moment.duration(timeCode).asSeconds();

            let segmentNumber = Math.floor(seconds / 5);
            const hasExtraSegment = seconds % 5;

            if (!!hasExtraSegment) {
                console.log("Has extra");
                segmentNumber += 1;
            }

            res(segmentNumber);
        });
    })

}