const AWS = require('aws-sdk');
const S3 = new AWS.S3();


exports.handler = async(event, context) => {

    const getPromises = () => new Promise((res, rej) => {
        const promises = [];
        // const run = async () => {
        for (let i = 0; i < 37; i++) {
            // console.log(data);
            const params = {
                Bucket: "hboremixbucket",
                Key: `output/${i}.json`
            };
            const promise = S3.getObject(params).promise();
            promises.push(promise);
        }


        Promise.allSettled(promises).
        then((results) => res(results));
    });

    const data = await getPromises();

    const writeJSON = (data) => new Promise((res, rej) => {
        //Might have to make this block a promise??
        let jsonArray = [];


        data.forEach(data => {
            const buffValue = data.value.Body;
            const buffToJSON = JSON.parse(buffValue.toString());
            jsonArray = [...jsonArray, buffToJSON];
        });

        const uploadData = S3.upload({
            Bucket: 'hboremixbucket',
            Key: 'output/full_json.json',
            Body: JSON.stringify(jsonArray)
        }, (data, err) => {
            console.log(data);
            res();
        })

        console.log(uploadData);
    })

    const writeJson = await writeJSON(data);



    const response = {
        statusCode: 200,
        body: JSON.stringify({ succes: true })
    }

    return response;
};
