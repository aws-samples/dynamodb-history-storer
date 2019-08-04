'use strict';
const aws = require('aws-sdk');
const util = require('./util');

const encodeRecord = record => {
    return {
        Data: Buffer.from(JSON.stringify(record) + '\n')
    };
};

const getOnSuccessPutRecordBatch = (firehoseStreamName, recordsCount) => {
    return data => {
        util.assertAttributes(data, 'FailedPutCount');
        if (data.FailedPutCount > 0) {
            util.assertAttributes(data, 'RequestResponses');
            console.error(`Failed to put ${data.FailedPutCount} of ${recordsCount} Messages.` +
                ` RequestResponses: ${JSON.stringify(data.RequestResponses)}`)
        }
        const writtenRecordCount = recordsCount - data.FailedPutCount;
        console.info(`Wrote ${writtenRecordCount} records to Firehose ${firehoseStreamName}`);
        return writtenRecordCount;
    };
};

const writeToFirehose = async (firehoseStreamName, records) => {
    const encodedRecords = records.map(encodeRecord);

    console.info(`Writing ${records.length} records to firehose stream ${firehoseStreamName}`);

    const firehose = new aws.Firehose({
        apiVersion: '2015-08-04',
        region: process.env['AWS_REGION']
    });

    const params = {
        DeliveryStreamName: firehoseStreamName,
        Records : encodedRecords
    };

    return firehose.putRecordBatch(params).promise()
        .then(getOnSuccessPutRecordBatch(firehoseStreamName, records.length))
        .catch(err => {
            throw new Error(err);
        });
};

module.exports = {writeToFirehose};
