import { PreSignUpTriggerHandler } from "aws-lambda";

/**
 * Pre-signup Lambda trigger for Cognito
 * This function automatically confirms users during the signup process
 * and performs basic validation on the custom attributes
 */
export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log("Pre-signup event:", JSON.stringify(event, null, 2));

  try {
    // Get user attributes from the event
    const { userAttributes } = event.request;

    // Validate required custom attributes
    const requiredAttributes = [
      "name",
      "restaurant_name",
      "cuisine_type",
      "location",
    ];
    for (const attr of requiredAttributes) {
      if (!userAttributes[attr]) {
        throw new Error(`Missing required attribute: ${attr}`);
      }
    }

    // Auto-confirm the user (they will still need to verify their email)
    event.response.autoConfirmUser = true;

    return event;
  } catch (error) {
    console.error("Error in pre-signup trigger:", error);
    throw error;
  }
};
