'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk-mock');
const dynamodb = require('../src/dynamodb');
AWS.setSDK(path.resolve('node_modules/aws-sdk'));

const EVENTS = {
    insert: JSON.parse(fs.readFileSync('tst/res/events/insert.json')),
    modify: JSON.parse(fs.readFileSync('tst/res/events/modify.json')),
    remove: JSON.parse(fs.readFileSync('tst/res/events/remove.json')),
    multiple: JSON.parse(fs.readFileSync('tst/res/events/multiple.json')),
};

const TABLE_DESCRIPTION = {
    Table: {
        KeySchema: [
            {
                AttributeName: 'HashKeyExample',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'SortKeyExample',
                KeyType: 'RANGE'
            }
        ]
    }
};

const decodeRecord = (record) => JSON.parse(record.Data.toString('utf8'));
const mockDynamoDbDescribeTable = () => {
    AWS.mock('DynamoDB', 'describeTable', (params, callback) => {
        expect(params.TableName).to.equal('TestArchiving');
        callback(false, TABLE_DESCRIPTION);
    });
};

describe('index.handler', () => {
    process.env = {
        FIREHOSE_STREAM_NAME: 'DynamoDBHistoryStream-test',
        AWS_REGION: 'us_west_2',
        EXTRACTED_ATTRIBUTES: 'HashKeyExample,AnotherAttribute'
    };
    let app = require('../src/');
    let context = {};

    afterEach(() => {
        AWS.restore('Firehose');
        AWS.restore('DynamoDB');
    });

    it('when required attribute is missing', async () => {
        let event = {};
        let callback = sinon.fake();
        try {
            await app.handler(event, context, callback);
            expect.fail('Error should be thrown.');
        } catch (err) {
            expect(err.message).to.equal('Cannot find attribute [Records]');
        }
    });

    describe('when record is inserted', () => {
        it('write insert event to firehose stream', async () => {
            mockDynamoDbDescribeTable();
            AWS.mock('Firehose', 'putRecordBatch', (params, callback) => {
                expect(params.DeliveryStreamName).to.equal('DynamoDBHistoryStream-test');
                expect(params.Records.length).to.equal(1);
                expect(decodeRecord(params.Records[0])).to.eql({
                    TableName: 'TestArchiving',
                    HashKey: 'hash_key_value',
                    SortKey: 'sort_key_value',
                    NewImage: {
                        HashKeyExample: {
                            "S": "hash_key_value"
                        },
                        SortKeyExample: {
                            "S": "sort_key_value"
                        },
                        AnotherAttribute: {
                            "N": 10
                        }
                    },
                    EventName: 'INSERT',
                    Timestamp: 1544767080,
                    SequenceNumber: '8793800000000000596909317',
                    HashKeyExample: 'hash_key_value',
                    AnotherAttribute: 10
                });
                callback(false, {FailedPutCount:0});
            });
            let callback = sinon.fake();

            const result = await app.handler(EVENTS.insert, context, callback);
            expect(result).to.equal('Written messages: 1');
        });
    });

    describe('when record is modified', () => {
        it('write modify event to firehose stream', async () => {
            mockDynamoDbDescribeTable();
            AWS.mock('Firehose', 'putRecordBatch', (params, callback) => {
                expect(params.DeliveryStreamName).to.equal('DynamoDBHistoryStream-test');
                expect(params.Records.length).to.equal(1);
                expect(decodeRecord(params.Records[0])).to.deep.equal({
                    TableName: 'TestArchiving',
                    HashKey: 'hash_key_value',
                    SortKey: 'sort_key_value',
                    NewImage: {
                        HashKeyExample: {
                            "S": "hash_key_value"
                        },
                        SortKeyExample: {
                            "S": "sort_key_value"
                        },
                        AnotherAttribute: {
                            "N": 20
                        }
                    },
                    OldImage: {
                        HashKeyExample: {
                            "S": "hash_key_value"
                        },
                        SortKeyExample: {
                            "S": "sort_key_value"
                        },
                        AnotherAttribute: {
                            "N": 10
                        }
                    },
                    EventName: 'MODIFY',
                    Timestamp: 1544772480,
                    SequenceNumber: "8793900000000000598695047",
                    HashKeyExample: 'hash_key_value',
                    AnotherAttribute: 20
                });
                callback(false, {FailedPutCount:0});
            });
            let callback = sinon.fake();

            const result = await app.handler(EVENTS.modify, context, callback);
            expect(result).to.equal('Written messages: 1');
        });
    });

    describe('when record is deleted', () => {
        it('write delete event to firehose stream', async () => {
            mockDynamoDbDescribeTable();
            AWS.mock('Firehose', 'putRecordBatch', (params, callback) => {
                expect(params.DeliveryStreamName).to.equal('DynamoDBHistoryStream-test');
                expect(params.Records.length).to.equal(1);
                expect(decodeRecord(params.Records[0])).to.deep.equal({
                    TableName: 'TestArchiving',
                    HashKey: 'hash_key_value',
                    SortKey: 'sort_key_value',
                    OldImage: {
                        HashKeyExample: {
                            "S": "hash_key_value"
                        },
                        SortKeyExample: {
                            "S": "sort_key_value"
                        },
                        AnotherAttribute: {
                            "N": 10
                        }
                    },
                    EventName: 'REMOVE',
                    Timestamp: 1544772480,
                    SequenceNumber: '8517700000000000103743087'
                });
                callback(false, {FailedPutCount:0});
            });
            let callback = sinon.fake();

            const result = await app.handler(EVENTS.remove, context, callback);
            expect(result).to.equal('Written messages: 1');
        });
    });

    describe('when multiple events are received', () => {
        it('write 2 events to firehose stream', async () => {
            mockDynamoDbDescribeTable();
            AWS.mock('Firehose', 'putRecordBatch', (params, callback) => {
                expect(params.Records.length).to.equal(2);
                callback(false, {FailedPutCount:0});
            });
            let callback = sinon.fake();

            const result = await app.handler(EVENTS.multiple, context, callback);
            expect(result).to.equal('Written messages: 2');
        });
    });

    describe('when firehose failed to write some record', () => {
        it('return number of succeeded rows', async () => {
            mockDynamoDbDescribeTable();
            AWS.mock('Firehose', 'putRecordBatch', (params, callback) => {
                callback(false, {
                    FailedPutCount:1,
                    RequestResponses: [{
                        RecordId: 0,
                        ErrorCode: 'ERROR_CODE',
                        ErrorMessage: 'ERROR_MESSAGE'
                    }]
                });
            });
            let callback = sinon.fake();

            const result = await app.handler(EVENTS.multiple, context, callback);
            expect(result).to.equal('Written messages: 1');
        });
    });

    describe('when firehose call failed', () => {
        it('return error', async () => {
            mockDynamoDbDescribeTable();
            AWS.mock('Firehose', 'putRecordBatch', (params, callback) => {
                callback('FAILURE', undefined)
            });
            let callback = sinon.fake();

            try {
                await app.handler(EVENTS.multiple, context, callback);
                expect.fail('Error should be thrown.');
            } catch (err) {
                expect(err.message).to.equal('FAILURE');
            }
        });
    });
});

describe('dynamodb.getTableNameFromArn', () => {
    describe('table name has alphanumeric only', () => {
        it('simple table name', () => {
            const tableName = "arn:aws:dynamodb:us-west-2:111122223333:table/TestTable123/stream/2015–05–11T21:21:33.291";
            expect(dynamodb.getTableNameFromArn(tableName)).to.equal('TestTable123');
        })
    });

    describe('table name has dash', () => {
        it('table name with dash', () => {
            const tableName = "arn:aws:dynamodb:us-west-2:111122223333:table/TestTable-123/stream/2015–05–11T21:21:33.291";
            expect(dynamodb.getTableNameFromArn(tableName)).to.equal('TestTable-123');
        })
    });

    describe('table name has underscore', () => {
        it('table name with underscore', () => {
            const tableName = "arn:aws:dynamodb:us-west-2:111122223333:table/TestTable_123/stream/2015–05–11T21:21:33.291";
            expect(dynamodb.getTableNameFromArn(tableName)).to.equal('TestTable_123');
        })
    });

    describe('table name has dot', () => {
        it('table name with dot', () => {
            const tableName = "arn:aws:dynamodb:us-west-2:111122223333:table/TestTable.123/stream/2015–05–11T21:21:33.291";
            expect(dynamodb.getTableNameFromArn(tableName)).to.equal('TestTable.123');
        })
    });
});
