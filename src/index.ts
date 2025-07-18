import * as dotenv from "dotenv";
if (process.env.IS_OFFLINE) {
  dotenv.config();
}
// Main entry point for the restaurant menu optimizer application
console.log("Restaurant Menu Optimizer initializing...");

export const handler = async (event: any): Promise<any> => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  // Placeholder for actual implementation
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Restaurant Menu Optimizer service is running",
    }),
  };
};
