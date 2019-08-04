'use strict';
const util = require('./util');
const RecordTransformer = require('./RecordTransformer');
const output = require('./output');

util.assertAttributes(process.env, 'FIREHOSE_STREAM_NAME', 'AWS_REGION', 'EXTRACTED_ATTRIBUTES');

const extractedAttributes = util.parseArray(process.env.EXTRACTED_ATTRIBUTES);

const transform = async (records) => {
    const transformer = new RecordTransformer();
    await transformer.prepare(records);
    return records.map(record => transformer.transformRecord(record, extractedAttributes));
};

exports.handler = async (event) => {
    try {
        console.info(`Received event: ${JSON.stringify(event)}`);

        util.assertAttributes(event, 'Records');
        const records = await transform(event.Records);
        const successCount = await output.writeToFirehose(process.env.FIREHOSE_STREAM_NAME, records);
        return `Written messages: ${successCount}`;
    } catch (err) {
        console.error(`Failed to handle the input event. ${err}`);
        throw err;
    }
};
