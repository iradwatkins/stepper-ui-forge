import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function FeaturesSection() {
  const features = [
    {
      image: "/lovable-uploads/3c4aecbb-1547-4e1e-b2a8-bf9ae37f1803.png",
      title: "Stepping Events",
      description: "Discover upcoming competitions, showcases, and social dances near you.",
      link: "/events",
      linkText: "Find Events"
    },
    {
      image: "/lovable-uploads/4cf885ed-1d17-4ea6-8ca0-9c5e84f1cbd4.png",
      title: "Dance Classes",
      description: "Learn from top instructors and master various stepping styles and techniques.",
      link: "/classes",
      linkText: "Browse Classes"
    },
    {
      image: "/lovable-uploads/57af8e89-b2a5-4ec1-b145-021863925527.png",
      title: "Step Magazine",
      description: "Stay informed with the latest news, tips, and stories from the stepping community.",
      link: "/magazine",
      linkText: "Read Articles"
    },
    {
      image: "/lovable-uploads/7ffbb66b-e2d6-4230-9b1c-5ba02697b9ac.png",
      title: "Community",
      description: "Connect with fellow dancers and share your passion for stepping.",
      link: "/community",
      linkText: "Join Community"
    }
  ];

  return (
    <div className="bg-background py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Explore the Stepping World</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-card rounded-lg shadow-md p-6 flex flex-col items-center text-center transition-transform hover:scale-105">
              <div className="mb-4">
                <img src={feature.image} alt={feature.title} className="h-16 w-16 object-cover rounded-md" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground mb-5">{feature.description}</p>
              <Link to={feature.link} className="text-primary hover:underline mt-auto">
                {feature.linkText} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}