# Overview

A serverless application which enables audit on changes in DynamoDB tables. It automatically stores changes(insert/modify/delete) in specified DynamoDB tables to S3 bucket, and enables search from Athena.

# License

This project is licensed under the terms of the Apache 2.0 license. See `LICENSE`.
Included AWS Lambda functions are licensed under the MIT-0 license. See `LICENSE.MIT-0`.

# Usage
## Install
1. Install the app from Serverless Application Repository
1. Register your DynamoDB tables as triggers from the Lambda function ```DynamoDBHistoryStorer-{stage}```.
(Histories will start to be recorded to an S3 bucket)
## Search History
1. Go to Athena console
1. Run any query to the table ```dynamodb_history_storer_{stage}.dynamodb_history```
   * Select ```DynamoDBHistory-QueryExample``` from Saved Queries to find an example.

# Development
## Setup
Install dependent packages
```console
npm install
```

## Unit test
Run test and report coverage 
```console
npm run build
npm run test
```

## Test via SAM in your test account
Configure AWS account information for SAM deployment
```console
npm run setup
# you will be asked for credentials
```

Configure bucket for uploading SAM package
```console
npm config set dynamodb-history-storer:bucket YOUR_BUCKET_NAME
```

Build SAM package
```console
npm run package
```

Deploy SAM package for test
```console
npm run deploy
```

Delete stack for SAM package
```console
npm run delete-stack
```

## Publish your application
Publish application to Serverless Application Repository
```console
npm run publish
```
