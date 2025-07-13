import { RefObject } from "react";

interface HeroCarouselSlidesProps {
  displayImages: string[];
  scrollPosition: number;
  slideWidth: number;
  carouselRef: RefObject<HTMLDivElement>;
}

export function HeroCarouselSlides({
  displayImages,
  scrollPosition,
  slideWidth,
  carouselRef
}: HeroCarouselSlidesProps) {
  return (
    <div className="absolute inset-0 flex h-full w-full">
      <div 
        ref={carouselRef}
        className="relative flex w-full h-full transition-transform duration-1000 ease-in-out" 
        style={{ transform: `translateX(-${scrollPosition * slideWidth}%)` }}
      >
        {displayImages.map((image, index) => (
          <div
            key={index}
            className="h-full relative flex-shrink-0"
            style={{ width: `${slideWidth}%`, minWidth: `${slideWidth}%` }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${image})` }}
            />
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-black/30" />
          </div>
        ))}
      </div>
    </div>
  );
}