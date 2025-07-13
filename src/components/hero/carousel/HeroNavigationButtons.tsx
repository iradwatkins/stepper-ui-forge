import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroNavigationButtonsProps {
  onPrevClick: () => void;
  onNextClick: () => void;
}

export function HeroNavigationButtons({ 
  onPrevClick, 
  onNextClick 
}: HeroNavigationButtonsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/40 hover:bg-white/60 text-white rounded-full z-20 h-8 w-8 md:h-10 md:w-10"
        onClick={onPrevClick}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/40 hover:bg-white/60 text-white rounded-full z-20 h-8 w-8 md:h-10 md:w-10"
        onClick={onNextClick}
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    </>
  );
}