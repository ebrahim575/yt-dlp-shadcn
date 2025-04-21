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
  let finalFilename = '';

  try {
    // Get video metadata for filename
    const metadata = await ytDlpWrap.getVideoInfo(url);
    const title = metadata.title || 'video';
    const artist = metadata.artist || 'unknown';
    
    // Create filename with title and artist
    finalFilename = `${title} - ${artist}.${format}`.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();

    // Prepare download options
    const tempDir = os.tmpdir();
    const uniqueSuffix = Date.now();
    tempFilePath = path.join(tempDir, `${uniqueSuffix}.${format}`);

    const options: string[] = [
      url,
      '-o', tempFilePath,
      '--no-warnings',
      '--ignore-errors',
      '--retries', '2',
    ];

    if (format === 'mp3') {
      options.push(
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '192K',
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

    if (!fs.existsSync(tempFilePath)) {
      throw new Error('yt-dlp completed but the output file was not found.');
    }

    const fileBuffer = fs.readFileSync(tempFilePath);

    const headers = new Headers();
    headers.set('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${finalFilename}"`);
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
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error(`Error cleaning up temporary file ${tempFilePath}:`, cleanupError);
      }
    }
  }
}