const AWS = require('aws-sdk');
const s3 = new AWS.S3();
console.log('Loading function');

exports.handler = async (event, context) => {
    console.log(event);
    const fileName = event.fileName;
    const bucket = event.bucket;
    
    const {ContentLength} = await getFullFileSize(bucket, fileName);
    console.log(ContentLength);
    const byteRangeValues = calculateByteRangeValues(ContentLength);
    console.log(byteRangeValues);
    //Probably need to be tweaked
    const middleFactorIndex = Math.floor(byteRangeValues.length / 2);
    const byteRangeValue = byteRangeValues[middleFactorIndex - 1] * 188
    console.log(byteRangeValue);
    const numberOfSegments = byteRangeValues[middleFactorIndex] + 1;
    console.log(numberOfSegments);
    
    const byteRanges = generateByteRangeResponseObject(8781292, 19 + 1);
    
    const s3Response = await writeResponseObjectToS3(bucket, byteRanges);
    
    console.log(s3Response);
    
    return {
        byteRanges
    }
    
};

const writeResponseObjectToS3 = (bucket, byteParamObject) => {
    const params = {
        Bucket: bucket,
        Key: 'testParam.json',
        Body: JSON.stringify(byteParamObject)
    }
    return s3.upload(params).promise();
}

const getFullFileSize = (bucket,key) => {
    const params = { Bucket: bucket,Key: key };
    return s3.headObject(params).promise();
}

const generateByteRangeResponseObject = (byteRange, numberOfSegments) => {
    const responseObject = [];
    
    let byteRangeBefore = 0;
    let byteRangeAfter = byteRange
    for (let index = 0; index < numberOfSegments - 1; index++) {
        
        const object = {
            index,
            byteRangeBefore,
            byteRangeAfter
        }
        
        responseObject.push(object);

        byteRangeAfter += byteRange;
        byteRangeBefore += byteRange;
    }
    
    return responseObject;
}

const calculateByteRangeValues = (num) => {
    const factors = [];

    let half = Math.floor(num / 2), // Ensures a whole number <= num.
        str = '1', // 1 will be a part of every solution.
        i,j;

    factors.push(1);
    // Determine our increment value for the loop and starting point.
    num % 2 === 0 ? (i = 2,j = 1) : (i = 3,j = 2);

    for (i; i <= half; i += j) {
        num % i === 0 ? factors.push(i) : false;
    }

    factors.push(num);
    
    return factors;
}