const AWS = require('aws-sdk');
const fs = require('fs');
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
    console.log(event);
    const manifestInfo = event;
    /**
     *  byteRangeBefore: 0,
        byteRangeAfter: 8781292,
        index: 0,
        segmentTime: '8.425500'
    */
    const header = "#EXTM3U";
    const manifestTargetDuration = "#EXT-X-TARGETDURATION:10";
    const manifestVersion = "#EXT-X-VERSION:4";
    const manifestMediaSequence = "#EXT-X-MEDIA-SEQUENCE:0";
    const manifestPlaylistType = "#EXT-X-PLAYLIST-TYPE:VOD";
    const byteRangeValue = event[0].byteRangeAfter;
    const fileName = 'combined.ts';
    
    fs.writeFileSync('/tmp/another.m3u8',`${header}\n`);
    fs.appendFileSync('/tmp/another.m3u8',`${manifestTargetDuration}\n`,err => err ? console.log(err) : console.log("Success!"));
    fs.appendFileSync('/tmp/another.m3u8',`${manifestVersion}\n`,err => err ? console.log(err) : console.log("Success!"));
    fs.appendFileSync('/tmp/another.m3u8',`${manifestMediaSequence}\n`,err => err ? console.log(err) : console.log("Success!"));
    fs.appendFileSync('/tmp/another.m3u8',`${manifestPlaylistType}\n`,err => err ? console.log(err) : console.log("Success!"));
    
    let byteTotal = 0;
   
    manifestInfo.forEach(manifest => {
        const {segmentTime} = manifest;
        const sectionTime = `#EXTINF:${segmentTime}`;
        
        const sectionByteRange = `#EXT-X-BYTERANGE:${byteRangeValue}@${byteTotal}`;
        fs.appendFileSync('/tmp/another.m3u8',`${sectionTime}\n`,err => err ? console.log(err) : console.log("Success!"));
        fs.appendFileSync('/tmp/another.m3u8',`${sectionByteRange}\n`,err => err ? console.log(err) : console.log("Success!"));
        fs.appendFileSync('/tmp/another.m3u8',`${fileName}\n`,err => err ? console.log(err) : console.log("Success!"));
        byteTotal += byteRangeValue;
    });
    
    fs.appendFileSync('/tmp/another.m3u8',`#EXT-X-ENDLIST`,err => err ? console.log(err) : console.log("Success!"));
    
    const params = {
        Bucket: 'hboremixbucket',
        Key: 'hls_manifest/lambda_manifest.m3u8',
        ACL: 'public-read',
        ContentType: 'application/vnd.apple.mpegurl',
        Body: fs.createReadStream('/tmp/another.m3u8')
    };
    
    const data = await s3.upload(params).promise();
    console.log(data);
    
    const response = {
        statusCode: 200,
        body: JSON.stringify({success: true})
    }
    
    return response;
};