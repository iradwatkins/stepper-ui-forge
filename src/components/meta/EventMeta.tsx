import { Helmet } from 'react-helmet-async';
import { EventWithStats } from '@/types/database';
import { ShareService } from '@/lib/services/ShareService';

interface EventMetaProps {
  event: EventWithStats;
  currentUrl?: string;
}

export const EventMeta = ({ event, currentUrl }: EventMetaProps) => {
  // Use current URL or construct from window location
  const pageUrl = currentUrl || (typeof window !== 'undefined' ? window.location.href : '');
  
  // Generate meta tags using ShareService
  const metaTags = ShareService.generateMetaTags(event, pageUrl);
  
  // Format date for structured data
  const eventDate = new Date(event.date);
  const isoDate = eventDate.toISOString();
  
  // Create structured data for better SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.description || `Join us for ${event.title}. All things Stepping. Come to stepperslife.com to buy tickets`,
    "startDate": isoDate,
    "location": {
      "@type": "Place",
      "name": event.location,
      "address": event.location
    },
    "organizer": {
      "@type": "Organization",
      "name": event.organization_name || "Steppers Life",
      "url": "https://stepperslife.com"
    },
    "image": metaTags['og:image'],
    "url": pageUrl,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{metaTags['og:title']}</title>
      <meta name="description" content={metaTags['og:description']} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={metaTags['og:title']} />
      <meta property="og:description" content={metaTags['og:description']} />
      <meta property="og:url" content={metaTags['og:url']} />
      <meta property="og:type" content={metaTags['og:type']} />
      <meta property="og:site_name" content={metaTags['og:site_name']} />
      
      {/* Open Graph Image */}
      {metaTags['og:image'] && (
        <>
          <meta property="og:image" content={metaTags['og:image']} />
          <meta property="og:image:width" content={metaTags['og:image:width']} />
          <meta property="og:image:height" content={metaTags['og:image:height']} />
          <meta property="og:image:alt" content={`${event.title} event image`} />
        </>
      )}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={metaTags['twitter:card']} />
      <meta name="twitter:title" content={metaTags['twitter:title']} />
      <meta name="twitter:description" content={metaTags['twitter:description']} />
      <meta name="twitter:site" content={metaTags['twitter:site']} />
      
      {metaTags['twitter:image'] && (
        <meta name="twitter:image" content={metaTags['twitter:image']} />
      )}
      
      {/* Event-specific meta tags */}
      <meta property="event:start_time" content={metaTags['event:start_time']} />
      <meta property="event:location" content={metaTags['event:location']} />
      <meta property="event:organizer" content={metaTags['event:organizer']} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={pageUrl} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      
      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content={event.organization_name || "Steppers Life"} />
      <meta name="keywords" content={`stepping, events, ${event.categories?.join(', ')}, ${event.location}, steppers life`} />
      
      {/* Mobile optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="format-detection" content="telephone=no" />
    </Helmet>
  );
};