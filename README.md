# YouTube to MP3 / MP4 Converter

This is a web application built with Next.js that allows users to download YouTube videos as either MP3 audio or MP4 video files.

## Features

*   Convert YouTube videos to high-quality MP3 or MP4.
*   Select desired format (MP3 or MP4) using a toggle.
*   Displays video title, uploader (channel name), and thumbnail.
*   Copy the original YouTube video URL to the clipboard.
*   Visual indicators for metadata loading and download initiation.
*   Generated filenames follow the pattern "Title - Uploader Name.extension" and are sanitized and length-limited.
*   Embeds thumbnail and standard metadata into the downloaded files.

## Technologies Used

*   **Next.js:** React framework for building the web application.
*   **React:** Frontend library for building the user interface.
*   **Tailwind CSS:** Utility-first CSS framework for styling.
*   **Shadcn UI:** Reusable UI components built with Tailwind CSS and Radix UI.
*   **yt-dlp:** Command-line program to download videos from YouTube and other sites.
*   **yt-dlp-wrap:** Node.js wrapper for `yt-dlp`.

## Getting Started

### Prerequisites

*   Node.js (version 18 or higher recommended)
*   npm or yarn or pnpm or bun
*   `yt-dlp` installed and available in your system's PATH. You can find installation instructions [here](https://github.com/yt-dlp/yt-dlp#installation).

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository_url>
    cd yt-dlp-shadcn
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

### Running Locally

1.  Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```
2.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This application uses Next.js API routes which require a serverless or server environment to run the `yt-dlp` process. Platforms like Vercel or AWS Amplify can be used, but require careful configuration to include the `yt-dlp` binary and manage potential resource limitations for large downloads.

## Contributing

(Optional: Add contributing guidelines here)

## License

(Optional: Add license information here)
