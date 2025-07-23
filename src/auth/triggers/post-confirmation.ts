import { PostConfirmationTriggerHandler } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

/**
 * Post-confirmation Lambda trigger for Cognito
 * This function logs the successful email confirmation
 * Restaurant profile setup will happen later in the workflow
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log("Post-confirmation event:", JSON.stringify(event, null, 2));

  try {
    // Only process if this is a sign-up event
    if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
      return event;
    }

    const { userAttributes } = event.request;
    const userId = event.userName;

    console.log(
      `User ${userId} with email ${userAttributes.email} has confirmed their account`
    );

    // Restaurant profile setup will happen later in the workflow
    // No database operations needed at this stage

    return event;
  } catch (error) {
    console.error("Error in post-confirmation trigger:", error);
    // We don't want to block the user confirmation process if there's an error
    // so we log the error but don't throw it
    return event;
  }
};
