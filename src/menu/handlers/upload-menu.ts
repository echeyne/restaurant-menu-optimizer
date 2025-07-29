/**
 * Lambda function for uploading menu files to S3
 * Handles file validation and generates pre-signed URLs for direct uploads
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { createResponse } from "../../models/api";
import { MenuFileRepository } from "../../repositories/menu-file-repository";
import { RestaurantRepository } from "../../repositories/restaurant-repository";

// Allowed file types for menu uploads
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword", // doc
  "application/vnd.ms-excel", // xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
];

// File extensions mapping to MIME types for validation
const FILE_EXTENSIONS_MAP: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg", "image/jpg"],
  jpeg: ["image/jpeg", "image/jpg"],
  txt: ["text/plain"],
  csv: ["text/csv"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Create repository instances
const menuFileRepository = new MenuFileRepository();
const restaurantRepository = new RestaurantRepository();

/**
 * Handler for menu upload requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, {});
    }

    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const { restaurantId, fileName, fileType, fileSize } = body;

    // Validate request parameters
    if (!restaurantId || !fileName || !fileType || !fileSize) {
      return createResponse(400, {
        message:
          "Missing required parameters: restaurantId, fileName, fileType, fileSize",
      });
    }

    // Check if restaurant profile setup is complete
    const restaurant = await restaurantRepository.getById(restaurantId);
    if (!restaurant) {
      return createResponse(404, {
        message: "Restaurant not found",
      });
    }

    if (!restaurant.profileSetupComplete) {
      return createResponse(403, {
        message:
          "Restaurant profile setup must be completed before uploading menu",
        profileSetupComplete: false,
      });
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return createResponse(400, {
        message: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(
          ", "
        )}`,
      });
    }

    // Additional validation for file extension matching the MIME type
    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    if (fileExtension && FILE_EXTENSIONS_MAP[fileExtension]) {
      if (!FILE_EXTENSIONS_MAP[fileExtension].includes(fileType)) {
        return createResponse(400, {
          message: `File extension .${fileExtension} does not match the provided MIME type ${fileType}`,
        });
      }
    } else if (fileExtension) {
      // If we have an extension but it's not in our map, reject it
      return createResponse(400, {
        message: `Unsupported file extension: .${fileExtension}`,
      });
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return createResponse(400, {
        message: `File size exceeds maximum allowed size of ${
          MAX_FILE_SIZE / (1024 * 1024)
        }MB`,
      });
    }

    // Generate a unique file key (fileExtension is already defined above)
    const fileKey = `menus/${restaurantId}/${uuidv4()}.${fileExtension}`;

    // Create S3 client
    const s3 = new S3({
      region: process.env.REGION || "us-east-1",
      signatureVersion: "v4",
    });

    // Generate pre-signed URL for direct upload
    const presignedUrl = await s3.getSignedUrlPromise("putObject", {
      Bucket: process.env.MENU_FILES_BUCKET || "",
      Key: fileKey,
      ContentType: fileType,
      Expires: 300, // URL expires in 5 minutes
      // Add metadata to track the file
      Metadata: {
        restaurantId,
        fileName: encodeURIComponent(fileName),
      },
      // Add a tagging configuration for easier management
      Tagging: `restaurantId=${encodeURIComponent(
        restaurantId
      )}&fileType=${encodeURIComponent(fileType)}`,
    });

    // Store menu file metadata in DynamoDB
    const menuFile = await menuFileRepository.create({
      restaurantId,
      fileName,
      fileKey,
      fileType,
      fileSize,
    });

    // Return the pre-signed URL and file details
    return createResponse(200, {
      uploadUrl: presignedUrl,
      fileKey,
      fileId: menuFile.fileId,
      expiresIn: 300,
    });
  } catch (error: any) {
    console.error("Error generating upload URL:", error);

    return createResponse(500, {
      message: "Error generating upload URL",
      error: error.message || String(error),
    });
  }
};
