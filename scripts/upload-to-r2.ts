import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { uploadToR2 } from "../lib/r2/upload-server";
import { generateR2Key, getFolderByType } from "../lib/r2/upload";

interface UploadMapping {
  uploadthingUrl: string;
  r2Url: string;
  r2Key: string;
  fileName: string;
}

async function uploadFilesToR2() {
  try {
    const localFilesDir = process.env.LOCAL_FILES_DIR || "./local-files";
    
    if (!fs.existsSync(localFilesDir)) {
      console.error(`❌ Directory not found: ${localFilesDir}`);
      console.log("   Please download files from UploadThing first");
      process.exit(1);
    }

    console.log("📤 Starting file upload to R2...");
    console.log(`   Source directory: ${localFilesDir}`);

    const mapping: UploadMapping[] = [];
    const files = getAllFiles(localFilesDir);

    console.log(`   Found ${files.length} files to upload`);

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const fileName = path.basename(filePath);
      const relativePath = path.relative(localFilesDir, filePath);
      
      // Try to extract UploadThing URL from file name or metadata
      // This assumes you have a way to map local files to UploadThing URLs
      // You may need to adjust this based on your file naming convention
      const uploadthingUrl = extractUploadThingUrl(fileName, relativePath);

      console.log(`   [${i + 1}/${files.length}] Uploading: ${fileName}`);

      try {
        const folder = getFolderByType(fileName);
        const key = generateR2Key(fileName, folder);
        const r2Url = await uploadToR2(filePath, key);

        mapping.push({
          uploadthingUrl: uploadthingUrl || `unknown-${i}`,
          r2Url,
          r2Key: key,
          fileName,
        });

        console.log(`      ✅ Uploaded: ${r2Url}`);
      } catch (error: any) {
        console.error(`      ❌ Error uploading ${fileName}:`, error.message);
      }
    }

    // Save mapping file
    const mappingPath = path.join(
      process.cwd(),
      "uploadthing-to-r2-mapping.json"
    );
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

    console.log(`\n✅ Upload complete!`);
    console.log(`   Total files: ${files.length}`);
    console.log(`   Successful: ${mapping.length}`);
    console.log(`   Mapping saved to: ${mappingPath}`);
  } catch (error: any) {
    console.error("❌ Error uploading files:", error.message);
    process.exit(1);
  }
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function extractUploadThingUrl(fileName: string, relativePath: string): string {
  // This is a placeholder - adjust based on your file naming convention
  // You might have a metadata file or naming pattern that includes the URL
  // For now, return a placeholder that can be manually updated
  return `https://utfs.io/f/${fileName}`;
}

uploadFilesToR2();

