'use strict';
const assert = require('assert');
const util = require('./util');
const dynamodb = require('./dynamodb');

const getDynamoDbValue = (map) => {
    if (Object.keys(map).length > 0) {
        return map[Object.keys(map)[0]];
    } else {
        return null;
    }
};

const getPrimaryKeys = (changeRecord, keyDefinition) => {
    util.assertAttributes(changeRecord, 'Keys');
    util.assertAttributes(keyDefinition, 'HASH');

    const result = {};
    util.assertAttributes(changeRecord.Keys, keyDefinition.HASH);
    result.HashKey = getDynamoDbValue(changeRecord.Keys[keyDefinition.HASH]);

    if (keyDefinition.hasOwnProperty('RANGE')) {
        util.assertAttributes(changeRecord.Keys, keyDefinition.RANGE);
        result.SortKey = getDynamoDbValue(changeRecord.Keys[keyDefinition.RANGE]);
    }

    return result;
};

const getTableArns = (records) => {
    const result = new Set();
    records.forEach(record => {
        util.assertAttributes(record, 'eventSourceARN');
        result.add(record.eventSourceARN);
    });
    return Array.from(result.values());
};

const extractAttributeValues = (recordImage, attributes, destination) => {
    attributes.forEach(attr => {
        if (recordImage[attr] !== undefined) {
            destination[attr] = getDynamoDbValue(recordImage[attr]);
        }
    });
};

module.exports = class RecordTransformer {
    async prepare(records) {
        this.arnToKeyStructureMap = await dynamodb.getTableKeyStructures(getTableArns(records));
    }

    transformRecord(record, attributes) {
        util.assertAttributes(record, 'eventName', 'eventSourceARN', 'dynamodb');
        assert(record.eventSource === 'aws:dynamodb', `event source should be aws:dynamodb, but is ${record.eventSource}`);

        const change = record.dynamodb;
        const result = getPrimaryKeys(change, this.arnToKeyStructureMap[record.eventSourceARN]);
        result.TableName = dynamodb.getTableNameFromArn(record.eventSourceARN);
        result.EventName = record.eventName;
        result.NewImage = change.NewImage;
        result.OldImage = change.OldImage;
        result.Timestamp = change.ApproximateCreationDateTime;
        result.SequenceNumber = change.SequenceNumber;
        if (change.NewImage !== undefined) {
            extractAttributeValues(change.NewImage, attributes, result);
        }

        return result;
    };
};
