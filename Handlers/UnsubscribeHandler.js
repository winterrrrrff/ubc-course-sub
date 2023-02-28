import {DeleteCommand, DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const unsubscribeHandler = async (event) => {
    const {userEmail, courseId} = event.pathParameters;
    const input = {
        TableName: `ubc-course-sub-${process.env.STAGE}-course`,
        Key: {
            courseId: courseId,
            subscriberEmail: userEmail
        }
    };
    const response = await client.send(new DeleteCommand(input));
    const exists = await checkIfExists(courseId);
    if (!exists) {
        await client.send(new DeleteCommand({
            TableName: `ubc-course-sub-${process.env.STAGE}-seats-remaining`,
            Key: {
                courseId: courseId
            }
        }));
    }
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: "Unsubscribe successfully",
                response: response
            },
            null,
            2
        ),
    };
};

const checkIfExists = async (courseId) => {
    const input = {
        TableName: `ubc-course-sub-${process.env.STAGE}-course`,
        ExpressionAttributeValues: {
            ":cid": courseId,
        },
        KeyConditionExpression: "courseId = :cid",
    };
    try {
        const data = await client.send(new QueryCommand(input));
        if (data.Count == 0) {
            return false;
        }
        return true;
    } catch (err) {
        console.log("Error", err);
    }
}
