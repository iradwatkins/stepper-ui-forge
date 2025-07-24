import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  Calendar, 
  Share2, 
  BookOpen,
  User,
  Tag
} from 'lucide-react';
import { useMagazine, MagazineArticle, ContentBlock } from '@/hooks/useMagazine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getArticleBySlug, categories, featuredArticles } = useMagazine();
  
  const [article, setArticle] = useState<MagazineArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState<MagazineArticle[]>([]);

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        const loadedArticle = await getArticleBySlug(slug);
        
        if (!loadedArticle) {
          setNotFound(true);
          return;
        }

        setArticle(loadedArticle);

        // Get related articles from the same category
        const related = featuredArticles
          .filter(a => 
            a.id !== loadedArticle.id && 
            a.category?.id === loadedArticle.category?.id
          )
          .slice(0, 3);
        setRelatedArticles(related);

      } catch (error) {
        console.error('Failed to load article:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [slug, getArticleBySlug, featuredArticles]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = article?.title || 'Article';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Article link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    }
  };

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'header':
        return (
          <h2 key={block.id} className="text-3xl font-bold mb-6 mt-8 first:mt-0">
            {block.content}
          </h2>
        );
      case 'subheader':
        return (
          <h3 key={block.id} className="text-2xl font-semibold mb-4 mt-6">
            {block.content}
          </h3>
        );
      case 'paragraph':
        return (
          <div 
            key={block.id} 
            className="text-lg leading-relaxed mb-6 text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        );
      case 'image':
        return (
          <div key={block.id} className="my-8">
            <img
              src={block.content}
              alt="Article content"
              className="w-full rounded-lg shadow-lg"
              loading="lazy"
            />
          </div>
        );
      case 'youtube_video':
        const youtubeMatch = block.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        const videoId = youtubeMatch ? youtubeMatch[1] : null;
        
        if (!videoId) {
          return (
            <div key={block.id} className="my-8 p-4 bg-muted rounded-lg text-center">
              <p className="text-muted-foreground">Invalid YouTube URL: {block.content}</p>
            </div>
          );
        }

        // Build YouTube URL with timing parameters
        let embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const urlParams = new URLSearchParams();
        
        if (block.startTime) {
          urlParams.append('start', block.startTime.toString());
        }
        if (block.endTime) {
          urlParams.append('end', block.endTime.toString());
        }
        
        if (urlParams.toString()) {
          embedUrl += '?' + urlParams.toString();
        }

        return (
          <div key={block.id} className="my-8">
            <iframe
              width="100%"
              height="400"
              src={embedUrl}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg"
            />
            {(block.startTime || block.endTime) && (
              <div className="mt-2 text-center text-sm text-muted-foreground">
                Video timing: 
                {block.startTime && ` starts at ${Math.floor(block.startTime / 60)}:${(block.startTime % 60).toString().padStart(2, '0')}`}
                {block.endTime && ` ends at ${Math.floor(block.endTime / 60)}:${(block.endTime % 60).toString().padStart(2, '0')}`}
              </div>
            )}
          </div>
        );
      case 'embedded_video':
        return (
          <div key={block.id} className="my-8">
            <div 
              dangerouslySetInnerHTML={{ __html: block.content }}
              className="video-embed"
            />
            {(block.startTime || block.endTime) && (
              <div className="mt-2 text-center text-sm text-muted-foreground">
                Video timing: 
                {block.startTime && ` starts at ${Math.floor(block.startTime / 60)}:${(block.startTime % 60).toString().padStart(2, '0')}`}
                {block.endTime && ` ends at ${Math.floor(block.endTime / 60)}:${(block.endTime % 60).toString().padStart(2, '0')}`}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-64 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-6xl mb-6">📰</div>
            <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <div className="space-x-2">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => navigate('/magazine')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Magazine
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/magazine')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Magazine
          </Button>
        </div>

        {/* Article Header */}
        <article className="prose prose-lg max-w-none">
          <header className="mb-8">
            {article.category && (
              <div className="mb-4">
                <Badge variant="secondary" className="mb-2">
                  <Tag className="w-3 h-3 mr-1" />
                  {article.category.name}
                </Badge>
              </div>
            )}
            
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={article.authorAvatar} />
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <span>{article.authorName || 'Anonymous'}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(article.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{article.readTimeMinutes || 5} min read</span>
              </div>

              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{article.viewCount || 0} views</span>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleShare}
                className="h-auto p-2"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Featured Image */}
            {article.featuredImage && (
              <div className="mb-8">
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
                />
              </div>
            )}
          </header>

          {/* Article Content */}
          <div className="article-content">
            {article.contentBlocks && article.contentBlocks.length > 0 ? (
              article.contentBlocks
                .sort((a, b) => a.order - b.order)
                .map(renderContentBlock)
            ) : (
              <p className="text-muted-foreground italic">
                This article doesn't have any content yet.
              </p>
            )}
          </div>
        </article>

        {/* Article Footer */}
        <footer className="mt-12 pt-8 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={article.authorAvatar} />
                <AvatarFallback>
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{article.authorName || 'Anonymous'}</p>
                <p className="text-sm text-muted-foreground">Article Author</p>
              </div>
            </div>
            <Button onClick={handleShare} variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share Article
            </Button>
          </div>
        </footer>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((relatedArticle) => (
                <Card 
                  key={relatedArticle.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/magazine/article/${relatedArticle.slug}`)}
                >
                  {relatedArticle.featuredImage && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={relatedArticle.featuredImage}
                        alt={relatedArticle.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">
                      {relatedArticle.title}
                    </h3>
                    {relatedArticle.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {relatedArticle.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{relatedArticle.readTimeMinutes || 5} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{relatedArticle.viewCount || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section className="mt-16 text-center bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-4">Enjoyed this article?</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Discover more stories, tutorials, and insights from the stepping community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/magazine')} size="lg">
              <BookOpen className="w-4 h-4 mr-2" />
              Read More Articles
            </Button>
            <Button onClick={() => navigate('/events')} variant="outline" size="lg">
              Explore Events
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}