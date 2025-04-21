'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Image from 'next/image'; // <-- Added Image import
import { Moon, Sun, X, Loader2 } from "lucide-react"; // <-- Added Loader2 for loading state
import { getStoredDownloadPath, setStoredDownloadPath } from "@/lib/utils";

type CardItem = {
  url: string;
  status: 'pending' | 'loading' | 'triggered' | 'error'; // <-- Added 'loading' status
  title?: string;    // <-- Added optional title
  artist?: string;   // <-- Added optional artist
  thumbnail?: string; // <-- Added optional thumbnail
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
    if (e.key === 'Enter') {
      const trimmedUrl = inputValue.trim();
      if (!trimmedUrl) return; // Don't submit if empty
      console.log(`[handleInputSubmit] Started for URL: ${trimmedUrl}`); // Log start

      // Add card with loading state immediately
      const newCard: CardItem = { url: trimmedUrl, status: 'loading' };
      console.log('[handleInputSubmit] Adding loading card:', newCard); // Log card add
      setCards(prevCards => [...prevCards, newCard]);
      setInputValue(''); // Clear input after adding

      try {
        console.log(`[handleInputSubmit] Fetching metadata from /api/metadata?url=${encodeURIComponent(trimmedUrl)}`); // Log fetch start
        const response = await fetch(`/api/metadata?url=${encodeURIComponent(trimmedUrl)}`);
        console.log('[handleInputSubmit] Fetch response received:', response); // Log raw response
        const data = await response.json();
        console.log('[handleInputSubmit] Parsed data:', data); // Log parsed data

        if (response.ok && data.success) {
          console.log('[handleInputSubmit] Fetch successful. Updating card state.'); // Log success path
          setCards(prevCards => {
            const updatedCards = prevCards.map(card =>
              card.url === trimmedUrl && card.status === 'loading'
                ? { ...card, title: data.title, artist: data.artist, thumbnail: data.thumbnail, status: 'pending' }
                : card
            );
            console.log('[handleInputSubmit] New cards state (success):', updatedCards); // Log updated state
            return updatedCards;
          });
        } else {
          console.error("[handleInputSubmit] Metadata fetch failed:", data?.message || `Status: ${response.status}`); // Log failure path
          setCards(prevCards => {
            const updatedCards = prevCards.map(card =>
              card.url === trimmedUrl && card.status === 'loading' ? { ...card, status: 'error' } : card
            );
            console.log('[handleInputSubmit] New cards state (failure):', updatedCards); // Log updated state
            return updatedCards;
          });
        }
      } catch (error) {
        console.error("[handleInputSubmit] Error calling metadata API:", error); // Log catch block
        setCards(prevCards => {
           const updatedCards = prevCards.map(card =>
            card.url === trimmedUrl && card.status === 'loading' ? { ...card, status: 'error' } : card
          );
          console.log('[handleInputSubmit] New cards state (catch):', updatedCards); // Log updated state
          return updatedCards;
        });
      }
    }
  };

  const handleDeleteCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleDownload = async () => {
    if (isDownloading || cards.length === 0) return;

    setIsDownloading(true);
    const formatString = isMP4 ? 'mp4' : 'mp3';

    const cardsToDownload = cards.filter(card => card.status === 'pending');
    if (cardsToDownload.length === 0) {
      setIsDownloading(false);
      return;
    }

    setCards(prevCards =>
      prevCards.map(card =>
        card.status === 'pending' ? { ...card, status: 'triggered' } : card
      )
    );

    for (const card of cardsToDownload) {
      try {
        const apiUrl = `/api/download-single?url=${encodeURIComponent(card.url)}&format=${formatString}`;
        const link = document.createElement('a');
        link.href = apiUrl;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        setCards(prevCards => prevCards.map(c =>
          c.url === card.url ? { ...c, status: 'error' } : c
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
                className={`flex flex-col gap-2 p-4 border rounded-lg bg-muted ${
                  card.status === 'error' ? 'border-red-500' : '' // Highlight error cards
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-grow min-w-0"> {/* Added flex-grow and min-w-0 */}
                    {card.status === 'loading' && (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                    {card.thumbnail && card.status !== 'loading' && (
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
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      </main>
    </div>
  );
}