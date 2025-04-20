'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { Moon, Sun, X } from "lucide-react";
import { getStoredDownloadPath, setStoredDownloadPath } from "@/lib/utils";

// Define the structure for a card item including status and progress
type CardItem = {
  url: string;
  status: 'pending' | 'triggered' | 'error';
  progress: number;
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

  const handleInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      setCards([...cards, { url: inputValue.trim(), status: 'pending', progress: 0 }]);
      setInputValue('');
    }
  };

  const handleDeleteCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleDownload = async () => {
    if (isDownloading || cards.length === 0) return;

    setIsDownloading(true);
    const formatString = isMP4 ? 'mp4' : 'mp3';

    // Create a new array to update statuses immutably
    // Only trigger downloads for pending cards
    const cardsToDownload = cards.filter(card => card.status === 'pending');
    if (cardsToDownload.length === 0) {
      console.log("No pending URLs to download.");
      setIsDownloading(false);
      return;
    }

    // Update status for cards that will be triggered
    setCards(prevCards =>
      prevCards.map(card =>
        card.status === 'pending' ? { ...card, status: 'triggered', progress: 0 } : card
      )
    );

    console.log(`Starting downloads for ${cardsToDownload.length} URLs... Format: ${formatString}`);

    for (const card of cardsToDownload) {
      try {
        const apiUrl = `/api/download-single?url=${encodeURIComponent(card.url)}&format=${formatString}`;
        console.log(`Triggering download for: ${card.url}`);

        // Create a temporary link to trigger the download
        const link = document.createElement('a');
        link.href = apiUrl;
        link.setAttribute('download', '');
        
        // Add progress event listener
        link.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setCards(prevCards => prevCards.map(c =>
              c.url === card.url ? { ...c, progress } : c
            ));
          }
        });

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Update progress to 100% after download is triggered
        setCards(prevCards => prevCards.map(c =>
          c.url === card.url ? { ...c, progress: 100 } : c
        ));

      } catch (error) {
        console.error(`Failed to trigger download for ${card.url}:`, error);
        setCards(prevCards => prevCards.map(c =>
          c.url === card.url ? { ...c, status: 'error', progress: 0 } : c
        ));
      }
    }

    console.log('All download triggers initiated.');
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
                className="flex flex-col gap-2 p-4 border rounded-lg bg-muted"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{card.url}</span>
                  <button
                    onClick={() => handleDeleteCard(index)}
                    className="p-1 rounded-full hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={card.progress} 
                    className="flex-1 h-2 [&>div]:bg-primary"
                  />
                  <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                    {card.progress}%
                  </span>
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
