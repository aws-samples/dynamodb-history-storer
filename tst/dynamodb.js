'use strict';
const chai = require('chai');
const expect = chai.expect;
const dynamodb = require("../src/dynamodb");

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