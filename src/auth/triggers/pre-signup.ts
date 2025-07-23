import { PreSignUpTriggerHandler } from "aws-lambda";

/**
 * Pre-signup Lambda trigger for Cognito
 * This function validates the signup process for email/password only registration
 */
export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log("Pre-signup event:", JSON.stringify(event, null, 2));

  try {
    // Get user attributes from the event
    const { userAttributes } = event.request;

    // Validate that email is provided
    if (!userAttributes.email) {
      throw new Error("Email is required");
    }

    // Email verification is required - do not auto-confirm
    event.response.autoConfirmUser = false;
    event.response.autoVerifyEmail = false;

    return event;
  } catch (error) {
    console.error("Error in pre-signup trigger:", error);
    throw error;
  }
};
