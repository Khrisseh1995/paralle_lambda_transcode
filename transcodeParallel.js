const { spawn } = require('child_process');
const AWS = require('aws-sdk');
const S3 = new AWS.S3({
    signatureVersion: 'v4'
});
exports.handler = async(event) => {


    //All OG Stuff
    const transcodeChunk = () => new Promise((res, rej) => {
        const params = {
            Bucket: event.bucket,
            Key: event.file_name
        }

        const url = S3.getSignedUrl('getObject', params);

        console.log(url);
        const data = spawn('./ffmpeg-bin/ffmpeg', [
            '-y',
            '-i',
            url,
            '-ss',
            event.start_position,
            '-c:v',
            'libx264',
            '-t',
            '5',
            '-hls_time',
            '5',
            '-ignore_io_errors',
            '1',
            '-f',
            'hls',
            'pipe:1'
        ]);
        
        data.stderr.on('data', data => {
            console.log(data.toString());
        });

        const upload = S3.upload({
            Bucket: 'hboremixbucket',
            Key: `output/${event.output_file_name}`,
            Body: data.stdout
        }, (err, data) => {
            console.log(err)
            console.log(data);
            res();
        })

    });


    const writeJson = () => new Promise((res, rej) => {
        const params = { Bucket: 'hboremixbucket', Key: `output/${event.output_file_name}` };
        const url = S3.getSignedUrl('getObject', params);

        const objectInfo = {
            index: event.index,
            url,
            file_name: event.output_file_name
        }

        S3.upload({
            Bucket: 'hboremixbucket',
            Key: `output/${event.index}.json`,
            Body: JSON.stringify(objectInfo)
        }, (err, data) => {
            console.log(err);
            console.log('The URL is', url);
            console.log(data);
            res();
        });
    });

    await transcodeChunk();
    await writeJson();

    const response = {
        statusCode: 200, 
        body: JSON.stringify({success: true})
    };
    
    return response;
};
