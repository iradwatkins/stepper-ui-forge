import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CopyIcon, QrCodeIcon, LinkIcon, CheckIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface MarketingLinkGeneratorProps {
  eventId: string;
  eventTitle: string;
  organizerId: string;
}

export default function MarketingLinkGenerator({ 
  eventId, 
  eventTitle, 
  organizerId 
}: MarketingLinkGeneratorProps) {
  const [resellerId, setResellerId] = useState('');
  const [commissionRate, setCommissionRate] = useState('5');
  const [generatedLink, setGeneratedLink] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateMarketingLink = () => {
    // Generate unique marketing link with reseller tracking
    const baseUrl = window.location.origin;
    const linkId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const params = new URLSearchParams({
      event: eventId,
      reseller: resellerId || 'DIRECT',
      commission: commissionRate,
      ref: linkId
    });
    
    const marketingLink = `${baseUrl}/events/${eventId}?${params.toString()}`;
    setGeneratedLink(marketingLink);
    
    // Generate QR code URL (using a QR service)
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(marketingLink)}`;
    setQrCodeUrl(qrApiUrl);

    toast({
      title: "Marketing Link Generated!",
      description: "Your marketing link and QR code are ready to share.",
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold">Marketing Link Generator</h2>
          <p className="text-muted-foreground">Create shareable links for event promotion and ticket sales</p>
        </div>
      </div>

      {/* Link Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Marketing Link</CardTitle>
          <CardDescription>
            Create a trackable link for promoting "{eventTitle}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reseller-id">Reseller ID (Optional)</Label>
              <Input
                id="reseller-id"
                placeholder="Enter reseller identifier"
                value={resellerId}
                onChange={(e) => setResellerId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for direct sales tracking
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="50"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Commission for resellers (0-50%)
              </p>
            </div>
          </div>

          <Button onClick={generateMarketingLink} className="w-full">
            <LinkIcon className="w-4 h-4 mr-2" />
            Generate Marketing Link
          </Button>
        </CardContent>
      </Card>

      {/* Generated Link Display */}
      {generatedLink && (
        <Card>
          <CardHeader>
            <CardTitle>Your Marketing Materials</CardTitle>
            <CardDescription>
              Share these with your network to promote ticket sales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Link */}
            <div className="space-y-2">
              <Label>Marketing Link</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedLink)}
                >
                  {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* QR Code */}
            <div className="space-y-2">
              <Label>QR Code</Label>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="border rounded-lg p-4 bg-white">
                  <img 
                    src={qrCodeUrl} 
                    alt="Marketing QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-muted-foreground">
                    Customers can scan this QR code to directly access the event page and purchase tickets.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(qrCodeUrl, '_blank')}
                    >
                      <QrCodeIcon className="w-4 h-4 mr-2" />
                      Download QR Code
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(qrCodeUrl)}
                    >
                      <CopyIcon className="w-4 h-4 mr-2" />
                      Copy QR URL
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Link Details */}
            <Alert>
              <LinkIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Link Details:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Reseller:</span>{' '}
                      <Badge variant="outline">{resellerId || 'DIRECT'}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Commission:</span>{' '}
                      <Badge variant="outline">{commissionRate}%</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Event:</span>{' '}
                      <Badge variant="outline">{eventId.slice(-6)}</Badge>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
            <div>
              <strong>Share the Link:</strong> Send the marketing link via email, social media, or messaging apps.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">2</div>
            <div>
              <strong>Print QR Codes:</strong> Use the QR code on flyers, posters, or business cards for offline promotion.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">3</div>
            <div>
              <strong>Track Sales:</strong> All purchases through this link will be tracked for commission and analytics.
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">4</div>
            <div>
              <strong>Cash Payments:</strong> Customers can choose "Cash (In-Person)" to pay you directly using verification codes.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}