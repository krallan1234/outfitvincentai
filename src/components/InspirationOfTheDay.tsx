import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

const inspirationImages = [
  {
    url: '/images/beige-brown-ensemble.jpg',
    caption: 'Timeless Naturals'
  },
  {
    url: '/images/brown-jumpsuit.jpg',
    caption: 'Elegant Comfort'
  },
  {
    url: '/images/hero-brown-dress.jpg',
    caption: 'Sophisticated Layers'
  },
  {
    url: '/images/dashboard-background.jpg',
    caption: 'Classic Chic'
  }
];

export const InspirationOfTheDay = () => {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % inspirationImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="card-elegant overflow-hidden border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          Inspiration of the Day
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative">
        <div className="aspect-[4/3] relative overflow-hidden">
          {inspirationImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImage ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image.url}
                alt={`${image.caption} outfit inspiration`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white font-serif text-2xl drop-shadow-lg animate-fade-in">
                  {image.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 right-4 flex gap-2">
          {inspirationImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentImage 
                  ? 'bg-white w-6' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`View inspiration ${index + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
