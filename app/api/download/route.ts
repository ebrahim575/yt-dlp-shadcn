import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function POST(request: Request) {
  try {
    const { url, format } = await request.json();

    if (!url || !format) {
      return NextResponse.json({ error: 'Missing URL or format' }, { status: 400 });
    }

    // Get video info
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove special characters

    // Set up the response
    const response = new NextResponse();
    
    // Set headers for file download
    response.headers.set('Content-Disposition', `attachment; filename="${title}.${format}"`);
    response.headers.set('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');

    // Create the download stream
    const stream = ytdl(url, {
      format: format === 'mp3' ? 'audioonly' : 'highest',
      quality: 'highest',
    });

    // Pipe the stream to the response
    stream.pipe(response.body as any);

    return response;
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
} 