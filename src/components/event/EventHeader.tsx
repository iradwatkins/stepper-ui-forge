import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EventHeaderProps {
  children?: React.ReactNode;
}

export const EventHeader = ({ children }: EventHeaderProps) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Back Navigation Button */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </Button>
      </div>
      
      {children}
    </>
  );
};