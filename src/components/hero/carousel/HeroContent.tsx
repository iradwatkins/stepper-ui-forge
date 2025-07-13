import { Link } from "react-router-dom";

interface HeroContentProps {
  isMobile: boolean;
}

export function HeroContent({ isMobile }: HeroContentProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
      {/* Logo */}
      <div className={`mb-8 ${isMobile ? 'w-48' : 'w-64'}`}>
        <img
          src="/lovable-uploads/6bcc30f5-9623-4562-a26a-1c4b50f3028b.png"
          alt="Steppers Life Logo"
          className="w-full h-auto dark:hidden"
        />
        <img
          src="/lovable-uploads/2e635021-dedb-40f2-9817-c404d5bd828d.png"
          alt="Steppers Life Logo"
          className="w-full h-auto hidden dark:block"
        />
      </div>

      {/* Tagline */}
      <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
        Steppin is the Lifestyle
      </h2>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/magazine"
          className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
        >
          Magazine
        </Link>
        <Link
          to="/events"
          className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
        >
          Events
        </Link>
        <Link
          to="/classes"
          className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
        >
          Classes
        </Link>
        <Link
          to="/community"
          className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
        >
          Community
        </Link>
      </div>
    </div>
  );
}