import {DynamoDBClient, ScanCommand} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});
const input = {TableName: `ubc-course-sub-${process.env.STAGE}-course`};
const command = new ScanCommand(input);

export const handler = async (event) => {
    const response = await client.send(command);
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: "Go Serverless v3.0! Your function executed successfully!",
                input: event,
                response: response
            },
            null,
            2
        ),
    };
};
