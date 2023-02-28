import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {SendTemplatedEmailCommand, SESClient} from "@aws-sdk/client-ses";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sesClient = new SESClient({});
const templateName = "Notification_of_Available_Course_Seat";
export const notify = async (courseId, currSeatsRemaining) => {
    const emailList = await getEmailList(courseId);
    const courseArr = courseId.split(":");
    for (const user of emailList) {
        const input = {
            "Source": "ubc.course.sub@gmail.com",
            "Template": templateName,
            "Destination": {
                "ToAddresses": [user]
            },
            "TemplateData": JSON.stringify({
                "course_name": courseArr[0] + courseArr[1],
                "student_name": user.split("@")[0],
                "section": courseArr[2],
                "year": courseArr[3] + courseArr[4],
                "remaining_seat": currSeatsRemaining
            })
        };
        const response = await sesClient.send(new SendTemplatedEmailCommand(input));
        return response;
    }
}

export const getEmailList = async (courseId) => {
    const input = {
        TableName: `ubc-course-sub-${process.env.STAGE}-course`,
        ExpressionAttributeValues: {
            ":cid": courseId,
        },
        KeyConditionExpression: "courseId = :cid",
    };
    try {
        const data = await client.send(new QueryCommand(input));
        const emailList = [];
        for (const item of data.Items) {
            emailList.push(item.subscriberEmail);
        }
        return emailList;
    } catch (err) {
        console.log("Error", err);
    }
};



