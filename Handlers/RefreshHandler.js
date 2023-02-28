/*
everytime we refresh, we fetch all the active courses, and check if the total seats remaining:
                    1. smaller than the previous # of seats: then update prevSeatsRemaining
                    2. equal to the previous # of seats: do nothing
                    3. greater than the previous # of seats: send notification to subscribers
*/

import {DynamoDBClient, ScanCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb";
import {marshall} from "@aws-sdk/util-dynamodb";
import {parse} from 'node-html-parser';
import {notify} from "./NotifyHandler.js";

const client = new DynamoDBClient({});
const input = {TableName: `ubc-course-sub-${process.env.STAGE}-seats-remaining`};
const command = new ScanCommand(input);

export const refreshHandler = async (event) => {
    // fetch all active courses with prevSeatsRemaining
    const courses = await client.send(command);
    const response = {};
    for (let course of courses.Items) {
        const currSeatsRemaining = await getCurrSeatsRemaining(course.courseId.S);
        const prevSeatsRemaining = course.prevSeatsRemaining.N;
        if (currSeatsRemaining < prevSeatsRemaining) { // update prevSeatsRemaining to currSeatsRemaining
            await updateOnLowSeatsRemaining(course.courseId.S, currSeatsRemaining);
        } else if (currSeatsRemaining > prevSeatsRemaining) {
            await updateOnLowSeatsRemaining(course.courseId.S, currSeatsRemaining);
            await notify(course.courseId.S, currSeatsRemaining);
        }
        response[course.courseId.S] = `prev: ${prevSeatsRemaining} and cur: ${currSeatsRemaining} and compare: ${currSeatsRemaining < prevSeatsRemaining}`;
    }
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: "Test refresh handler",
                response: response
            },
            null,
            2
        ),
    };

}

// fetch the UBC course website based on the course dept, id, and section, and session year and term
const getCurrSeatsRemaining = async (courseId) => {
    // const courseId = course.courseId.S;
    const dept = courseId.split(":")[0];
    const id = courseId.split(":")[1];
    const section = courseId.split(":")[2];
    const sessyr = new Date().getFullYear() - 1;
    const sesscd = "W"
    const URL = `https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-section&dept=${dept}&course=${id}&section=${section}&sessyr=${sessyr}&sesscd=${sesscd}`;
    // const URL = "https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-section&dept=CPSC&course=304&section=101&sessyr=2022&sesscd=W"
    const result = await fetch(URL);
    const txt = await result.text();
    const seatsRemaining = parse(txt).querySelector("td:contains('Total Seats Remaining')");
    return Number(seatsRemaining.nextSibling.text);
}

const updateOnLowSeatsRemaining = async (courseId, currSeatsRemaining) => {
    const input = {
        TableName: `ubc-course-sub-${process.env.STAGE}-seats-remaining`,
        Key: marshall({
            "courseId": courseId
        }),
        ExpressionAttributeValues: marshall({
            "\:val": currSeatsRemaining
        }),
        UpdateExpression: "set prevSeatsRemaining = \:val"
    };
    await client.send(new UpdateItemCommand(input))
}
