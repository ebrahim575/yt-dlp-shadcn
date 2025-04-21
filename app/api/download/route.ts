import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function POST(request: Request) {
  try {
    const { url, format } = await request.json();

    if (!url || !format) {
      return NextResponse.json({ error: 'Missing URL or format' }, { status: 400 });
    }


    // Get video info to find available formats

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove special characters for filename

    // Find the best format based on the requested type
    let selectedFormat;
    if (format === 'mp3') {
      // Find the best audio-only format
      selectedFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    } else { // format === 'mp4'
      // Find the best combined video and audio format
      selectedFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
    }

    if (!selectedFormat) {
        return NextResponse.json({ error: `No suitable format found for ${format}` }, { status: 404 });
    }

    // Create the download stream using the selected format
    const stream = ytdl(url, { format: selectedFormat });

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${title}.${format}"`);
    headers.set('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');

    // Return the stream directly as the response body
    // Casting to any to bypass potential complex type conflicts between Node.js streams and Web Streams in Next.js types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(stream as any, { headers });

  } catch (error) {
    console.error('Download error:', error);
    // Check if the error is a ytdl-core error with a specific message
    if (error instanceof Error && error.message.includes('No video formats found')) {
       return NextResponse.json({ error: 'No downloadable formats found for this video.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}