# Complete Guide: Migrating from UploadThing to Cloudflare R2

## Overview
This guide covers migrating from UploadThing to Cloudflare R2 with:
- Real-time upload progress tracking
- Server-Sent Events (SSE) for progress updates
- CORS configuration for video playback
- Database URL migration
- File organization by type

## Part 1: Setup and Configuration

### 1.1 Install Required Dependencies
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
npm install -D dotenv
```

### 1.2 Environment Variables
Add to your `.env` file:
```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev
# Or use custom domain: https://cdn.yourdomain.com
```

### 1.3 Cloudflare R2 Setup
1. Create an R2 bucket in Cloudflare Dashboard
2. Enable Public Access in bucket settings
3. Create API tokens (R2:Read, R2:Write)
4. Note your Account ID, Access Key ID, and Secret Access Key

## Part 2: Core R2 Configuration Files

### 2.1 R2 Client Configuration
✅ **Created**: `lib/r2/config.ts`
- Configures S3Client for R2
- Validates environment variables

### 2.2 R2 Upload Utilities
✅ **Created**: `lib/r2/upload.ts`
- `uploadToR2()` - Upload files to R2
- `fileExistsInR2()` - Check if file exists
- `generateR2Key()` - Generate unique file keys
- `getFolderByType()` - Organize files by type (images, videos, documents, audio)

## Part 3: Upload API Route with Real-Time Progress

### 3.1 Upload Route
✅ **Created**: `app/api/r2/upload/route.ts`

**Features:**
- Server-Sent Events (SSE) for real-time progress
- Multipart upload support for large files (>5MB)
- Automatic Content-Type detection
- Progress tracking from 0-100%
- Authentication check
- Automatic folder organization

## Part 4: Client-Side Upload Component

### 4.1 File Upload Component
✅ **Created**: `components/r2-file-upload.tsx`

**Features:**
- Drag & drop support
- Real-time progress bar
- SSE stream parsing
- Error handling
- File size validation
- Automatic folder detection based on endpoint

**Usage:**
```tsx
import { R2FileUpload } from "@/components/r2-file-upload";

<R2FileUpload
  endpoint="courseImage" // or "courseAttachment" or "chapterVideo"
  onChange={(res) => {
    if (res) {
      console.log(res.url, res.name);
    }
  }}
/>
```

## Part 5: CORS Configuration for Video Playback

### 5.1 CORS Setup Script
✅ **Created**: `scripts/setup-r2-cors.ts`

**Run:**
```bash
npm run setup-r2-cors
```

This configures CORS headers for video playback:
- Allows GET and HEAD methods
- Exposes necessary headers (ETag, Content-Length, Content-Type, etc.)
- Sets MaxAge to 3600 seconds

## Part 6: Video Player Updates

### 6.1 Enhanced Video Player
✅ **Updated**: `components/plyr-video-player.tsx`
- Added `crossOrigin="anonymous"` attribute
- Supports R2 video URLs

## Part 7: Database Migration

### 7.1 Migration Process

**Step 1: Backup Database URLs**
```bash
npm run backup-db-urls
```
Creates a backup JSON file with all current URLs.

**Step 2: Download Existing Files (Optional)**
If you need to migrate existing files:
1. Download files from UploadThing to a local directory
2. Set `LOCAL_FILES_DIR` in `.env` to point to that directory

**Step 3: Upload to R2**
```bash
npm run upload-to-r2
```
- Uploads local files to R2
- Creates mapping file: `uploadthing-to-r2-mapping.json`

**Step 4: Migrate Database URLs**
```bash
npm run migrate-db-to-r2
```
- Loads mapping file
- Updates all database fields containing UploadThing URLs
- Updates: User.image, Course.imageUrl, Chapter.videoUrl, Attachment.url, Question.imageUrl

### 7.2 Migration Scripts
✅ **Created**:
- `scripts/backup-db-urls.ts` - Backup all URLs before migration
- `scripts/upload-to-r2.ts` - Upload local files to R2
- `scripts/migrate-db-urls-to-r2.ts` - Update database URLs

## Part 8: Package.json Scripts

✅ **Added**:
```json
{
  "scripts": {
    "upload-to-r2": "npx tsx ./scripts/upload-to-r2.ts",
    "migrate-db-to-r2": "npx tsx ./scripts/migrate-db-urls-to-r2.ts",
    "setup-r2-cors": "npx tsx ./scripts/setup-r2-cors.ts",
    "backup-db-urls": "npx tsx ./scripts/backup-db-urls.ts"
  }
}
```

## Part 9: Next.js Configuration

### 9.1 Image Domains
✅ **Updated**: `next.config.js`
Added R2 image domains:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.r2.dev',
    },
    {
      protocol: 'https',
      hostname: '**.r2.cloudflarestorage.com',
    },
  ],
}
```

## Part 10: Migration Workflow

### Step-by-Step Process:

1. **Setup R2 Bucket**
   - Create bucket in Cloudflare Dashboard
   - Enable Public Access
   - Create API tokens

2. **Configure Environment**
   - Add R2 credentials to `.env`

3. **Install Dependencies**
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
   npm install -D dotenv
   ```

4. **Setup CORS**
   ```bash
   npm run setup-r2-cors
   ```

5. **Download Existing Files (Optional)**
   - Download all files from UploadThing to local directory

6. **Upload to R2**
   ```bash
   npm run upload-to-r2
   ```
   This creates the mapping file.

7. **Backup Database**
   ```bash
   npm run backup-db-urls
   ```

8. **Migrate Database URLs**
   ```bash
   npm run migrate-db-to-r2
   ```

9. **Update Upload Components**
   - Replace `FileUpload` with `R2FileUpload` in your components
   - Update imports from `@/components/file-upload` to `@/components/r2-file-upload`

10. **Test Everything**
    - Test file uploads
    - Test video playback
    - Verify all URLs are updated

## Key Features Implemented

✅ Real-time progress tracking via SSE
✅ Multipart uploads for large files (>5MB)
✅ Automatic Content-Type detection
✅ Organized folder structure (images/, videos/, documents/, audio/)
✅ CORS configuration for video playback
✅ Database migration with URL mapping
✅ Error handling and retry logic
✅ Drag & drop file uploads

## Important Notes

- **R2 multipart uploads** require minimum 5MB part size
- **CORS must be configured** for video playback
- **Public access must be enabled** on R2 bucket
- **Always backup database** before migration
- **Test thoroughly** before deploying to production

## Troubleshooting

### Videos not playing
- Check CORS configuration: `npm run setup-r2-cors`
- Verify `crossOrigin="anonymous"` is set on video element
- Check R2 bucket public access settings

### Upload stuck at 10%
- Check R2 credentials in `.env`
- Verify bucket name is correct
- Check network connectivity

### Progress not updating
- Verify SSE stream parsing in component
- Check browser console for errors
- Ensure API route is returning proper SSE format

### Database migration fails
- Check mapping file exists: `uploadthing-to-r2-mapping.json`
- Verify database connection
- Check backup file was created

## Next Steps

1. **Replace Upload Components**: Update all components using `FileUpload` to use `R2FileUpload`
2. **Test Uploads**: Test all file upload endpoints (images, videos, attachments)
3. **Test Video Playback**: Verify videos play correctly from R2
4. **Monitor Usage**: Check Cloudflare R2 dashboard for usage and costs
5. **Remove UploadThing**: Once migration is complete, you can remove UploadThing dependencies

## Component Migration Example

**Before (UploadThing):**
```tsx
import { FileUpload } from "@/components/file-upload";

<FileUpload
  endpoint="courseImage"
  onChange={(res) => {
    if (res) {
      setImageUrl(res.url);
    }
  }}
/>
```

**After (R2):**
```tsx
import { R2FileUpload } from "@/components/r2-file-upload";

<R2FileUpload
  endpoint="courseImage"
  onChange={(res) => {
    if (res) {
      setImageUrl(res.url);
    }
  }}
/>
```

## Support

If you encounter any issues during migration:
1. Check the troubleshooting section
2. Verify all environment variables are set
3. Check Cloudflare R2 dashboard for errors
4. Review server logs for detailed error messages

