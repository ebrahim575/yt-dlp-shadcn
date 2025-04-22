import { NextRequest, NextResponse } from 'next/server';
import YtDlpWrap from 'yt-dlp-wrap';

// Initialize YtDlpWrap - Ensure yt-dlp binary is accessible in PATH or provide path
const ytDlpWrap = new YtDlpWrap();

import fs from 'fs'; // Import fs to check file existence

import path from 'path'; // Import path to join directory paths

export async function GET(request: NextRequest) {
  console.log(`[Metadata API] YTDLP_BIN environment variable: ${process.env.YTDLP_BIN}`);
  if (process.env.YTDLP_BIN) {
    console.log(`[Metadata API] yt-dlp binary exists at YTDLP_BIN path: ${fs.existsSync(process.env.YTDLP_BIN)}`);
  } else {
    console.log(`[Metadata API] YTDLP_BIN environment variable is not set.`);
  }

  // Log the contents of the /var/task/bin directory
  const binPath = '/var/task/bin/';
  try {
    const filesInBin = fs.readdirSync(binPath);
    console.log(`[Metadata API] Files in ${binPath}: ${filesInBin.join(', ')}`);
  } catch (error) {
    console.error(`[Metadata API] Error reading ${binPath}:`, error);
  }


  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ success: false, message: 'URL parameter is required' }, { status: 400 });
  }

  try {
    console.log(`Fetching metadata for URL: ${url} using execPromise`);
    // Execute yt-dlp with flags to only get JSON metadata without downloading
    const stdOut = await ytDlpWrap.execPromise([
      url,
      '--skip-download',
      '--dump-json',
      '--no-warnings', // Optional: reduce console noise
      '--ignore-errors', // Optional: attempt to continue if possible
    ]);

    console.log(`Raw JSON received:`, stdOut.substring(0, 200) + '...'); // Log snippet

    // Parse the JSON output from stdout
    const metadata = JSON.parse(stdOut);

    // Extract relevant fields - use 'uploader' or 'channel' for artist
    const title = metadata.title || 'Unknown Title';
    const artist = metadata.uploader || metadata.channel || 'Unknown Artist';
    const thumbnail = metadata.thumbnail || null; // Use null if no thumbnail

    console.log(`Parsed metadata: title=${title}, artist=${artist}, thumbnail=${thumbnail ? 'yes' : 'no'}`);

    return NextResponse.json({
      success: true,
      title,
      artist,
      thumbnail,
    });

  } catch (error: unknown) {
    console.error(`Error fetching metadata for URL ${url}:`, error);
    let errorMessage = 'Failed to fetch video metadata.';

    // Provide more specific error details if available
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check if it's a yt-dlp error with stderr
      if ('stderr' in error && typeof error.stderr === 'string' && error.stderr.trim()) {
         // Limit stderr length to avoid overly large responses
        errorMessage = `yt-dlp error: ${error.stderr.substring(0, 300).trim()}`;
      }
    }

    return NextResponse.json({ success: false, message: errorMessage, url: url }, { status: 500 });
  }
}