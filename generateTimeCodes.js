const AWS = require('aws-sdk');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const s3 = new AWS.S3({
    signatureVersion: 'v4'
});

exports.handler = async(event, context) => {
    const { byteRangeBefore, byteRangeAfter, index } = event;
    console.log(byteRangeAfter);
    console.log(byteRangeBefore);
    console.log(index);

    const fileName = await saveSegmentToTmp(byteRangeBefore, byteRangeAfter, index);

    const segmentTime = await singleMediaInfoDuration(fileName);

    const response = {
        byteRangeBefore,
        byteRangeAfter,
        index,
        segmentTime
    }

    return response;
};

const saveSegmentToTmp = (byteRangeBefore, byteRangeAfter, index) => new Promise(async (res,rej) => {
    const readStream = fs.createWriteStream(`/tmp/curl${index}.ts`);
    const params = {
        Bucket: 'hboremixbucket',
        Key: 'hls_manifest/combined.ts'
    }
    const url = s3.getSignedUrl('getObject', params);
    
    const {data} = await axios({
        url,
        method: 'GET',
        responseType: 'stream', // important
        headers: {
            "Range": `bytes=${byteRangeBefore}-${byteRangeAfter}`
        }    
    });

    data.pipe(readStream);

    data.on('close', () => res(`curl${index}`));
})

const singleMediaInfoDuration = async(fileName) => {
    const curl = () => new Promise((res, rej) => {
        const data = spawn('./ffmpeg-bin/ffprobe', [
            "-v",
            "quiet",
            "-show_entries",
            "stream=duration",
            "-of",
            "json",
            `/tmp/${fileName}.ts`
        ])
        data.stdout.on('data', data => {
            res(data.toString());
        });
    });

    const curlData = await curl();

    try {
        const { programs } = JSON.parse(curlData);
        const duration = programs[0].streams[0].duration;
        return duration;
    }
    catch (e) {
        const regex = /"duration": "[0-9]+.[0-9]+"/g
        const duration = curlData.match(regex)[0];
        const time = duration.split(" ")[1].replace(/['"]+/g, '');
        return time
    }
}