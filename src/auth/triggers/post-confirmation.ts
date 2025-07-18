import { PostConfirmationTriggerHandler } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

/**
 * Post-confirmation Lambda trigger for Cognito
 * This function creates a restaurant record in DynamoDB after a user confirms their account
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
    const restaurantId = uuidv4();
    const stage = process.env.STAGE || "dev";

    // Create restaurant record in DynamoDB
    const restaurantItem = {
      restaurantId,
      name: userAttributes.restaurant_name,
      cuisine: userAttributes.cuisine_type,
      location: userAttributes.location,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      settings: {
        priceRange: "MEDIUM",
        optimizationPreferences: {
          prioritizePopularity: true,
          prioritizeProfitability: true,
          enhanceDescriptions: true,
        },
      },
    };

    await dynamoDB
      .put({
        TableName: `${stage}-restaurants`,
        Item: restaurantItem,
      })
      .promise();

    console.log(`Created restaurant record with ID: ${restaurantId}`);

    return event;
  } catch (error) {
    console.error("Error in post-confirmation trigger:", error);
    // We don't want to block the user confirmation process if there's an error
    // creating the restaurant record, so we log the error but don't throw it
    return event;
  }
};
