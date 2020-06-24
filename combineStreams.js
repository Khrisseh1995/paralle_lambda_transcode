const AWS = require('aws-sdk');
const { spawn } = require('child_process');
console.log('Loading function');
const fs = require('fs');
const S3 = new AWS.S3();

exports.handler = async(event, context) => {

    const getJSON = () => new Promise(async(res, rej) => {

        const data = await S3.getObject({
            Bucket: 'hboremixbucket',
            Key: 'output/full_json.json'
        }).promise();

        const jsonParsed = JSON.parse(data.Body.toString());
        res(jsonParsed)
    })

    const streamData = await getJSON();
    const writeToTmp = () => new Promise((res, rej) => {
        let index = 0
        for (const data of streamData) {
            console.log(streamData);
            if (index === 0) {
                fs.writeFileSync('/tmp/concat.txt', `file '${data.url}'`);
                console.log(data.url);
                console.log(`Written output1`)
            }
            else {
                fs.appendFile('/tmp/concat.txt', `\nfile '${data.url}'`, (err) => {
                    console.log(data.url);
                    console.log(`Written Output${index + 1}`)
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.log("File written successfully");
                    }
                })
            }
            index++;
        }
        res();
    });

    await writeToTmp();

    const concatStreams = () => new Promise((res, rej) => {
        const data = spawn('./ffmpeg-bin/ffmpeg', [
            '-y',
            '-f',
            'concat',
            '-safe',
            '0',
            "-protocol_whitelist",
            "file,http,https,tcp,tls",
            "-i",
            "/tmp/concat.txt",
            '-c',
            'copy',
            '-f',
            'mpegts',
            'pipe:1',
            '-debug',
            '-v'
        ]);

        // data.stdout.on('data', data => console.log(data.toString()))
        // data.stdin.on('data', data => console.log(data.toString()))
        data.stderr.on('data', data => {
            // console.log(data)
        });
        
        data.stderr.on('close', data => res())
        data.stdout.on('close', data => res())
        data.stdin.on('close', data => res())

        S3.upload({
            Bucket: 'hboremixbucket',
            Key: 'hls_manifest/combined.ts',
            ACL: 'public-read',
            Body: data.stdout
        }, (err, data) => {
            console.log(data)
        });
    });

    await concatStreams();



    const response = {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
    }

    return response;
};
