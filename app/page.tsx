'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Image from 'next/image'; // <-- Added Image import
import { Moon, Sun, X, Loader2, Copy, Check } from "lucide-react"; // <-- Added Loader2, Copy, & Check icons
import { getStoredDownloadPath, setStoredDownloadPath } from "@/lib/utils";

type CardItem = {
  url: string;
  status: 'pending' | 'loading' | 'triggered' | 'error'; // <-- Added 'loading' status
  title?: string;    // <-- Added optional title
  artist?: string;   // <-- Added optional artist
  thumbnail?: string; // <-- Added optional thumbnail
  copied?: boolean; // <-- Added optional copied state for button feedback
};

export default function Home() {
  const [isDark, setIsDark] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [isMP4, setIsMP4] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPath, setDownloadPath] = useState(getStoredDownloadPath());

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const url = inputValue.trim();
      
      // Add card with loading state
      setCards(prev => [...prev, { url, status: 'loading' }]);
      
      try {
        // Get video info from our Next.js API endpoint
        const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch video info');
        }

        const data = await response.json();
        
        // Update card with video info
        setCards(prev => prev.map(card => 
          card.url === url 
            ? { 
                ...card, 
                status: 'pending',
                title: data.title,
                artist: data.artist,
                thumbnail: data.thumbnail
              }
            : card
        ));
      } catch (error) {
        console.error('Error fetching video info:', error);
        setCards(prev => prev.map(card => 
          card.url === url 
            ? { ...card, status: 'error' }
            : card
        ));
      }
      
      setInputValue('');
    }
  };

  const handleDeleteCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleDownload = async () => {
    if (isDownloading || cards.length === 0) return;

    setIsDownloading(true);

    const cardsToDownload = cards.filter(card => card.status === 'pending');
    if (cardsToDownload.length === 0) {
      setIsDownloading(false);
      return;
    }

    setCards(prevCards =>
      prevCards.map(card =>
        card.status === 'pending' ? { ...card, status: 'triggered' as CardItem['status'] } : card
      )
    );

    for (const card of cardsToDownload) {
      try {
        const response = await fetch(`/api/download-single?url=${encodeURIComponent(card.url)}&format=${isMP4 ? 'mp4' : 'mp3'}`);

        if (!response.ok) {
          throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${card.title || 'video'}.${isMP4 ? 'mp4' : 'mp3'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
        setCards(prevCards => prevCards.map(c =>
          c.url === card.url ? { ...c, status: 'error' as CardItem['status'] } : c
        ));
      }
    }

    setIsDownloading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <main className="flex flex-col items-center gap-8 w-full max-w-lg">
        <h1 className="text-4xl font-bold text-center whitespace-nowrap">
          Ebrahim&apos;s Youtube to mp3 /mp4 converter
        </h1>
        <div className="w-full space-y-2">
          <Input
            type="text"
            placeholder="Enter YouTube video URL here..."
            className="w-3/4 mx-auto text-center"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputSubmit}
          />
        </div>
        {cards.length > 0 && (
          <div className="w-full space-y-2">
            {cards.map((card, index) => (
              <div
                key={index}
                className={`flex flex-col gap-2 p-4 border rounded-lg ${
                  card.status === 'error' ? 'border-red-500 bg-red-100' : // Highlight error cards with red border and background
                  card.status === 'triggered' ? 'bg-blue-100 dark:bg-blue-900' : // Highlight triggered downloads with blue background
                  'bg-muted' // Default background
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-grow min-w-0"> {/* Added flex-grow and min-w-0 */}
                    {card.status === 'loading' && ( // Show loader only for loading status (metadata fetch)
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                    {card.thumbnail && card.status !== 'loading' && ( // Only show thumbnail when not loading
                      <div className="relative w-16 h-9 flex-shrink-0"> {/* Adjusted size, added flex-shrink-0 */}
                        <Image
                          src={card.thumbnail}
                          alt="Thumbnail"
                          fill
                          className="rounded object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0"> {/* Added min-w-0 */}
                      <span className="font-medium truncate">{card.title || card.url}</span> {/* Added truncate */}
                      {card.artist && (
                        <span className="text-sm text-muted-foreground truncate">{card.artist}</span>
                      )}
                      {/* Display URL and Copy Button */}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground truncate flex-1" title={card.url}>
                          {card.url}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-shrink-0"
                          onClick={async (e) => { // Made async to use await for clipboard
                            e.stopPropagation(); // Prevent card click or other parent events
                            try {
                              await navigator.clipboard.writeText(card.url);
                              // Update the specific card's copied state
                              setCards(prevCards =>
                                prevCards.map(c =>
                                  c.url === card.url ? { ...c, copied: true } : c
                                )
                              );
                              // Reset copied state after a delay
                              setTimeout(() => {
                                setCards(prevCards =>
                                  prevCards.map(c =>
                                    c.url === card.url ? { ...c, copied: false } : c
                                  )
                                );
                              }, 2000); // Reset after 2 seconds
                            } catch (err) {
                              console.error('Failed to copy URL: ', err);
                              // Optional: Show an error state or message
                            }
                          }}
                          title="Copy URL"
                        >
                          {card.copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />} {/* Conditional icon */}
                        </Button>
                      </div>
                      {card.status === 'error' && (
                         <span className="text-xs text-red-600">Failed to load metadata</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCard(index)}
                    className="p-1 rounded-full hover:bg-background flex-shrink-0 ml-2" // Added flex-shrink-0 and margin
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant={isDark ? "white" : "black"}
            onClick={() => setIsMP4(!isMP4)}
            className="w-16 relative overflow-hidden"
          >
            <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isMP4 ? 'opacity-0' : 'opacity-100'}`}>
              MP3
            </span>
            <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isMP4 ? 'opacity-100' : 'opacity-0'}`}>
              MP4
            </span>
          </Button>
          <span className="text-sm text-muted-foreground">
            Click to toggle format. Current: {isMP4 ? 'MP4' : 'MP3'}
          </span>
        </div>
        <div className="w-full space-y-2">
          <Input
            type="text"
            placeholder="Download path"
            className="w-3/4 mx-auto text-center"
            value={downloadPath}
            onChange={(e) => {
              setDownloadPath(e.target.value);
              setStoredDownloadPath(e.target.value);
            }}
          />
        </div>
        <Button
          variant={isDark ? "white" : "black"}
          onClick={handleDownload}
          className="relative overflow-hidden"
          disabled={cards.filter(c => c.status === 'pending').length === 0 || isDownloading}
        >
          {isDownloading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading...
            </span>
          ) : (
            'Download'
          )}
        </Button>
      </main>
    </div>
  );
}