import "dotenv/config";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "../lib/r2/config";

async function setupCORS() {
  try {
    if (!R2_BUCKET_NAME) {
      throw new Error("R2_BUCKET_NAME is not set in environment variables");
    }

    console.log("🔧 Setting up CORS configuration for R2 bucket...");
    console.log(`   Bucket: ${R2_BUCKET_NAME}`);

    const allowedOrigins = [
      "https://www.doctor-mohamed-mahmoud.com",
      "https://doctor-mohamed-mahmoud.com",
      "http://localhost:3000",
      ...(process.env.R2_CORS_ORIGINS
        ? process.env.R2_CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
        : []),
    ];

    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            // Browser direct uploads need PUT + preflight OPTIONS headers
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "HEAD", "PUT", "POST"],
            AllowedOrigins: allowedOrigins,
            ExposeHeaders: [
              "ETag",
              "Content-Length",
              "Content-Type",
              "Accept-Ranges",
              "Content-Range",
            ],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    console.log("   Allowed origins:");
    allowedOrigins.forEach((origin) => console.log(`   - ${origin}`));

    await r2Client.send(command);
    console.log("✅ CORS configuration applied successfully!");
  } catch (error: any) {
    console.error("❌ Error setting up CORS:", error.message);
    process.exit(1);
  }
}

setupCORS();

