/**
 * Scheduled analytics update handler
 * This Lambda function runs on a schedule to update analytics data for all restaurants
 */

import { ScheduledEvent, Context, ScheduledHandler } from "aws-lambda";
import { AnalyticsService } from "../../services/analytics-service";

const analyticsService = new AnalyticsService();

export const handler: ScheduledHandler = async (
  event: ScheduledEvent,
  context: Context
): Promise<void> => {
  console.log("Starting scheduled analytics update", {
    eventId: event.id,
    time: event.time,
    requestId: context.awsRequestId,
  });

  try {
    // Run the scheduled analytics updates
    await analyticsService.scheduleAnalyticsUpdates();

    console.log("Scheduled analytics update completed successfully");
  } catch (error) {
    console.error("Failed to complete scheduled analytics update:", error);
    throw error;
  }
};
