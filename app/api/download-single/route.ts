import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import YtDlpWrap from 'yt-dlp-wrap';

// Initialize YtDlpWrap - Consider adding the binary path if not in system PATH
const ytDlpWrap = new YtDlpWrap();

// Define max length for the filename base (title - artist part)
const MAX_FILENAME_BASE_LENGTH = 100;

// Helper function to sanitize filenames for HTTP headers
function sanitizeFilename(filename: string): string {
  // Replace filesystem-invalid characters and non-ASCII characters with underscores
  const sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]|[^ -~]/g, '_').trim();
  return sanitized;
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

  let tempDownloadDir: string | null = null; // Changed from tempFilePath

  try {
    // Create a unique temporary directory for the download
    tempDownloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytdlp-'));

    // Define the output template for yt-dlp
    // Uses title, uploader (with fallback), and extension. Saves into the temp dir.
    const outputTemplate = path.join(tempDownloadDir, `%(title)s - %(uploader, 'Unknown Uploader')s.%(ext)s`);

    const options: string[] = [
      url,
      '-o', outputTemplate, // Use the template for the output filename
      '--no-warnings',
      '--ignore-errors',
      '--retries', '2',
    ];

    if (format === 'mp3') {
      options.push(
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0', // Use 0 for best quality
        '--embed-thumbnail',
        '--add-metadata'
      );
    } else {
      options.push(
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--embed-thumbnail',
        '--add-metadata'
      );
    }

    await ytDlpWrap.execPromise(options);

    // Find the actual file downloaded in the temp directory
    const files = fs.readdirSync(tempDownloadDir);
    if (files.length !== 1) {
      // Handle cases where 0 or more than 1 file is found (e.g., playlist download attempt, error)
      throw new Error(`Expected one file in temporary directory, but found ${files.length}. Files: ${files.join(', ')}`);
    }
    const actualFilename = files[0];
    const actualFilePath = path.join(tempDownloadDir, actualFilename);

    if (!fs.existsSync(actualFilePath)) {
      throw new Error(`yt-dlp reported success but the output file "${actualFilename}" was not found.`);
    }

    // Separate filename into base and extension
    const fileExt = path.extname(actualFilename);
    const fileBase = path.basename(actualFilename, fileExt);

    // Sanitize the base part for the header
    const sanitizedFileBase = sanitizeFilename(fileBase);

    // Truncate the sanitized base part if it exceeds the max length
    const truncatedFileBase = sanitizedFileBase.length > MAX_FILENAME_BASE_LENGTH
      ? sanitizedFileBase.substring(0, MAX_FILENAME_BASE_LENGTH)
      : sanitizedFileBase;

    // Recombine the truncated, sanitized base with the original extension
    const safeHeaderFilename = `${truncatedFileBase}${fileExt}`;

    const fileBuffer = fs.readFileSync(actualFilePath);

    const headers = new Headers();
    headers.set('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${safeHeaderFilename}"`); // Use the actual sanitized filename
    headers.set('Content-Length', fileBuffer.length.toString());

    return new NextResponse(fileBuffer, { status: 200, headers });

  } catch (error: unknown) {
    console.error(`Error processing URL ${url}:`, error);
    let errorMessage = 'Failed to download video.';

    if (error instanceof Error) {
      errorMessage = error.message;
      if ('stderr' in error && typeof error.stderr === 'string') {
        errorMessage = `yt-dlp error: ${error.stderr.substring(0, 500)}`;
      }
    }

    return NextResponse.json({ success: false, message: errorMessage, url: url }, { status: 500 });

  } finally {
    // Clean up the temporary directory
    if (tempDownloadDir && fs.existsSync(tempDownloadDir)) {
      try {
        fs.rmSync(tempDownloadDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`Error cleaning up temporary directory ${tempDownloadDir}:`, cleanupError);
      }
    }
  }
}