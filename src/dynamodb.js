'use strict';
const aws = require('aws-sdk');
const assert = require('assert');

const getTableNameFromArn = (sourceARN) => {
    const found = sourceARN.match(/arn:aws:dynamodb:[^:]+:[0-9]+:table\/([\w-.]+)\/.*/);
    assert(found[1] !== undefined, 'Failed to parse ARN to extract table name:' + sourceARN);
    return found[1];
};

const getSingleTableKeyStructure = (() => { // Memoize result for each tableArn
    const cache = {};
    return async (tableArn) => {
        if (cache[tableArn] !== undefined) {
            return cache[tableArn];
        }

        console.info(`Getting key schema for table: ${tableArn}`);

        const dynamoDb = new aws.DynamoDB({
            apiVersion: '2012-08-10',
            region: process.env['AWS_REGION']
        });

        const data = await dynamoDb.describeTable({TableName: getTableNameFromArn(tableArn)}).promise();
        const keyStructure = {};
        data.Table.KeySchema.forEach((key) => {
            keyStructure[key.KeyType] = key.AttributeName;
        });
        cache[tableArn] = keyStructure;
        return keyStructure;
    };
})();

const getTableKeyStructures = async (tableArns) => {
    const keyStructures = await Promise.all(tableArns.map(getSingleTableKeyStructure));
    const result = {};
    for (let i = 0; i < tableArns.length; i++) {
        result[tableArns[i]] = keyStructures[i];
    }
    return result;
};

module.exports = {getTableNameFromArn, getTableKeyStructures};
