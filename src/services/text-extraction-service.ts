/**
 * Text extraction service for extracting text from various file formats
 * Supports PDF, PNG, JPEG, and JPG files using AWS Textract
 */

import { Textract, S3 } from "aws-sdk";

/**
 * Text extraction service
 */
export class TextExtractionService {
  private textract: Textract;
  private s3: S3;
  private bucketName: string;

  /**
   * Create a new text extraction service
   * @param bucketName S3 bucket name for temporary file storage
   */
  constructor(bucketName: string) {
    this.textract = new Textract({
      region: process.env.REGION || "us-east-1",
    });
    this.s3 = new S3({
      region: process.env.REGION || "us-east-1",
    });
    this.bucketName = bucketName;
  }

  /**
   * Extract text from a file in S3
   * @param fileKey S3 file key
   * @param fileType File MIME type
   * @returns Extracted text
   */
  async extractTextFromS3File(
    fileKey: string,
    fileType: string
  ): Promise<string> {
    // Get file from S3
    const fileObject = await this.s3
      .getObject({
        Bucket: this.bucketName,
        Key: fileKey,
      })
      .promise();

    // Extract text based on file type
    if (fileType === "application/pdf") {
      return this.extractTextFromPdf(fileKey);
    } else if (["image/png", "image/jpeg", "image/jpg"].includes(fileType)) {
      return this.extractTextFromImage(fileObject.Body as Buffer);
    } else if (["text/plain", "text/csv"].includes(fileType)) {
      // For plain text files, just return the content
      return fileObject.Body?.toString("utf-8") || "";
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Extract text from a PDF file in S3
   * @param fileKey S3 file key
   * @returns Extracted text
   */
  private async extractTextFromPdf(fileKey: string): Promise<string> {
    // Start asynchronous document text detection
    const startResponse = await this.textract
      .startDocumentTextDetection({
        DocumentLocation: {
          S3Object: {
            Bucket: this.bucketName,
            Name: fileKey,
          },
        },
      })
      .promise();

    // Get job ID
    const jobId = startResponse.JobId;
    if (!jobId) {
      throw new Error("Failed to start document text detection");
    }

    // Poll for job completion
    let result: Textract.GetDocumentTextDetectionResponse;
    do {
      // Wait 1 second between polls
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get job status
      result = await this.textract
        .getDocumentTextDetection({
          JobId: jobId,
        })
        .promise();
    } while (result.JobStatus === "IN_PROGRESS");

    // Check for job failure
    if (result.JobStatus === "FAILED") {
      throw new Error(
        `Document text detection failed: ${result.StatusMessage}`
      );
    }

    // Combine all detected text
    let fullText = "";
    let nextToken = result.NextToken;

    // Process initial results
    fullText += this.processTextractBlocks(result.Blocks || []);

    // Process additional pages if available
    while (nextToken) {
      const moreResults = await this.textract
        .getDocumentTextDetection({
          JobId: jobId,
          NextToken: nextToken,
        })
        .promise();

      fullText += this.processTextractBlocks(moreResults.Blocks || []);
      nextToken = moreResults.NextToken;
    }

    return fullText;
  }

  /**
   * Extract text from an image buffer
   * @param imageBuffer Image buffer
   * @returns Extracted text
   */
  private async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    // Detect document text in image
    const result = await this.textract
      .detectDocumentText({
        Document: {
          Bytes: imageBuffer,
        },
      })
      .promise();

    // Process and return detected text
    return this.processTextractBlocks(result.Blocks || []);
  }

  /**
   * Process Textract blocks into text
   * @param blocks Textract blocks
   * @returns Processed text
   */
  private processTextractBlocks(blocks: Textract.Block[]): string {
    let text = "";

    // Extract text from LINE blocks
    blocks.forEach((block) => {
      if (block.BlockType === "LINE" && block.Text) {
        text += block.Text + "\n";
      }
    });

    return text;
  }
}
