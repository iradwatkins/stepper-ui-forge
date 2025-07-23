import { useState, useEffect, useRef, useCallback } from "react";
import { useWindowSize } from "@/hooks/use-window-size";
import { HeroCarouselSlides } from "./carousel/HeroCarouselSlides";
import { HeroNavigationButtons } from "./carousel/HeroNavigationButtons";
import { HeroContent } from "./carousel/HeroContent";
import { HeroHeader } from "./carousel/HeroHeader";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function HeroCarousel() {
  const carouselImages = [
    "/lovable-uploads/3c4aecbb-1547-4e1e-b2a8-bf9ae37f1803.png",
    "/lovable-uploads/4cf885ed-1d17-4ea6-8ca0-9c5e84f1cbd4.png", 
    "/lovable-uploads/d3ce0a2f-e2fc-4869-9d50-2e9388a49324.png",
    "/lovable-uploads/20c5a7ec-e9eb-4e4b-89a8-1d278e005882.png",
    "/lovable-uploads/7ffbb66b-e2d6-4230-9b1c-5ba02697b9ac.png"
  ];

  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Responsive configuration
  const imagesPerView = isMobile ? 1 : isTablet ? 2 : 3;
  const slideWidth = 100 / imagesPerView;
  const maxScrollPosition = carouselImages.length - imagesPerView;
  
  // Handle auto-scrolling
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        moveCarousel(1);
      }
    }, 6000);
    
    return () => clearInterval(interval);
  }, [isAnimating, scrollPosition]);
  
  const moveCarousel = useCallback((direction: number) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    let newPosition = scrollPosition + direction;
    
    if (newPosition > maxScrollPosition) {
      newPosition = 0;
    } else if (newPosition < 0) {
      newPosition = maxScrollPosition;
    }
    
    setScrollPosition(newPosition);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  }, [isAnimating, scrollPosition, maxScrollPosition]);
  
  // Reset scroll position when screen size changes to avoid out-of-bounds positions
  useEffect(() => {
    if (scrollPosition > maxScrollPosition) {
      setScrollPosition(0);
    }
  }, [maxScrollPosition, scrollPosition]);
  
  const nextSlide = () => moveCarousel(1);
  const prevSlide = () => moveCarousel(-1);
  
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <HeroCarouselSlides 
        displayImages={carouselImages}
        scrollPosition={scrollPosition}
        slideWidth={slideWidth}
        carouselRef={carouselRef}
      />

      {/* Center content with logo and tagline */}
      <HeroContent isMobile={isMobile} />

      {/* Navigation arrows */}
      <HeroNavigationButtons onPrevClick={prevSlide} onNextClick={nextSlide} />

      {/* Desktop Login/Register button */}
      {!isMobile && <HeroHeader />}

      {/* Mobile bottom actions */}
      {isMobile && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-4 px-4 z-20">
          {!user && (
            <Button
              className="bg-[#02a2c8] hover:bg-[#02a2c8]/90 text-white"
              onClick={() => navigate('/account')}
            >
              Login / Register
            </Button>
          )}
          <Button
            variant="outline"
            className="border-white text-white hover:bg-white hover:text-black"
            onClick={() => {
              if (!user) {
                sessionStorage.setItem('postRedirect', '/create-event');
                navigate('/account');
              } else {
                navigate('/create-event');
              }
            }}
          >
            Post Event
          </Button>
        </div>
      )}
    </div>
  );
}