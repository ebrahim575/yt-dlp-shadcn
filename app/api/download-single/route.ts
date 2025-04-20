import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import YtDlpWrap from 'yt-dlp-wrap';

// Initialize YtDlpWrap - Consider adding the binary path if not in system PATH
const ytDlpWrap = new YtDlpWrap();

// Constants for filename handling
const MAX_FILENAME_LENGTH = 100; // Adjust based on your needs

// Helper function to sanitize filenames
function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const format = searchParams.get('format') || 'mp3'; // Default to mp3

  if (!url) {
    return NextResponse.json({ success: false, message: 'URL parameter is required' }, { status: 400 });
  }

  if (format !== 'mp3' && format !== 'mp4') {
    return NextResponse.json({ success: false, message: 'Invalid format parameter (must be mp3 or mp4)' }, { status: 400 });
  }

  let tempFilePath: string | null = null;
  let finalFilename = `download.${format}`; // Default filename

  try {
    // 1. Get video metadata for filename
    let baseFilename = 'download'; // Default base name
    try {
      const metadata = await ytDlpWrap.getVideoInfo(url);
      const title = metadata.title ? sanitizeFilename(metadata.title) : 'video';
      // Attempt to get artist, fallback gracefully
      const artist = metadata.artist ? sanitizeFilename(metadata.artist) : null;

      if (artist && artist.toLowerCase() !== 'various artists') { // Avoid generic 'Various Artists' if possible
         baseFilename = `${title} - ${artist}`;
      } else {
         baseFilename = title;
      }

      // Truncate the base filename if it's too long
      if (baseFilename.length > MAX_FILENAME_LENGTH) {
          baseFilename = baseFilename.substring(0, MAX_FILENAME_LENGTH).trim();
          // Ensure it doesn't end mid-word if possible (optional refinement)
          const lastSpace = baseFilename.lastIndexOf(' ');
          if (lastSpace > MAX_FILENAME_LENGTH / 2) { // Only cut if it leaves a reasonable part
              baseFilename = baseFilename.substring(0, lastSpace);
          }
      }
       finalFilename = `${baseFilename}.${format}`;

    } catch (infoError) {
      console.warn(`Could not fetch video metadata for ${url}:`, infoError);
      // Proceed with default filename structure
      finalFilename = `${baseFilename}.${format}`;
    }

    // 2. Prepare download options and temporary path
    const tempDir = os.tmpdir(); // Use system temp directory
    // Use a more unique temp name based on the final intended name + timestamp
    // Note: We use the *intended* final filename structure for the temp file
    // to potentially help yt-dlp with metadata if it uses the output template internally,
    // but add a timestamp/random element for uniqueness in the temp dir.
    const uniqueSuffix = Date.now();
    const tempFilename = `${baseFilename}_${uniqueSuffix}.${format}`;
    tempFilePath = path.join(tempDir, tempFilename);

    const options: string[] = [
      url,
      '-o', tempFilePath, // Output to temporary file
      '--no-warnings',
      '--ignore-errors', // Continue batch downloads if used later, but we handle errors here
      '--retries', '2', // Limit retries
    ];

    if (format === 'mp3') {
      options.push(
        '-x', // Extract audio
        '--audio-format', 'mp3',
        '--audio-quality', '192K', // Standard quality
        '--embed-thumbnail', // Embed thumbnail if possible
        '--add-metadata' // Add metadata like title/artist if possible
      );
    } else { // mp4
      options.push(
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', // Prefer mp4 container
        '--embed-thumbnail',
        '--add-metadata'
      );
    }

    console.log(`Executing yt-dlp with options: ${options.join(' ')}`);

    // 3. Execute download
    await ytDlpWrap.execPromise(options);

    // 4. Check if file exists (yt-dlp might fail silently sometimes)
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('yt-dlp completed but the output file was not found.');
    }

    // 5. Read the file and prepare response
    const fileBuffer = fs.readFileSync(tempFilePath);

    const headers = new Headers();
    headers.set('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${finalFilename}"`);
    headers.set('Content-Length', fileBuffer.length.toString());

    console.log(`Successfully processed ${url}. Sending file: ${finalFilename}`);

    // 6. Return file response
    return new NextResponse(fileBuffer, { status: 200, headers });

  } catch (error: unknown) {
    console.error(`Error processing URL ${url}:`, error);
    let errorMessage = 'Failed to download video.';

    // Type checking for error
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check if it might be a YtDlpWrap error which often includes stderr
      if ('stderr' in error && typeof error.stderr === 'string') {
         errorMessage = `yt-dlp error: ${error.stderr.substring(0, 500)}`; // Limit length
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      // Fallback for other error types
      errorMessage = 'An unknown error occurred during download.';
    }

    return NextResponse.json({ success: false, message: errorMessage, url: url }, { status: 500 });

  } finally {
    // 7. Cleanup: Delete temporary file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(`Error cleaning up temporary file ${tempFilePath}:`, cleanupError);
      }
    }
  }
}