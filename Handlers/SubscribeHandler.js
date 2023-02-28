import {DynamoDBDocumentClient, PutCommand, QueryCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
export const subscribeHandler = async (event) => {
    const data = JSON.parse(event.body);
    const exists = await checkIfExists(data.userEmail, data.courseId);
    if (exists) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "You have already subscribed to this course"
            })
        };
    }
    const input = {
        TableName: `ubc-course-sub-${process.env.STAGE}-course`,
        Item: {
            courseId: data.courseId,
            subscriberEmail: data.userEmail
        }
    }
    const response = await client.send(new PutCommand(input));
    // TODO: skip errors when attribute exists or find other solutions
    await client.send(new PutCommand({
        TableName: `ubc-course-sub-${process.env.STAGE}-seats-remaining`,
        Item: {
            courseId: data.courseId,
            // assumed that the remaining seat is 0
            prevSeatsRemaining: 0
        },
        ConditionExpression: "attribute_not_exists(courseId)"
    }));
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: "You have successfully subscribed to this course",
                response: response
            },
            null,
            2
        ),
    };
};

const checkIfExists = async (userEmail, courseId) => {
    const input = {
        TableName: `ubc-course-sub-${process.env.STAGE}-course`,
        ExpressionAttributeValues: {
            ":cid": courseId,
            ":email": userEmail
        },
        KeyConditionExpression: "courseId = :cid AND subscriberEmail = :email",
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

