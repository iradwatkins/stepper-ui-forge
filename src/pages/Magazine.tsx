import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Search, Filter, Clock, Eye } from 'lucide-react';
import { useMagazine, MagazineCategory, MagazineArticle } from '@/hooks/useMagazine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ImageWithLoading from '@/components/ui/ImageWithLoading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Magazine() {
  const navigate = useNavigate();
  const { categories, featuredArticles, loading, error } = useMagazine();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Combine featured articles with regular articles for masonry display
  const allArticles = [...featuredArticles];

  const filteredArticles = allArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (article.excerpt && article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || article.category?.slug === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Split articles into columns for masonry layout
  const distributeArticles = (articles: MagazineArticle[]) => {
    const columns: MagazineArticle[][] = [[], [], [], []];
    articles.forEach((article, index) => {
      columns[index % 4].push(article);
    });
    return columns;
  };

  const articleColumns = distributeArticles(filteredArticles);

  const ArticleCard = ({ article, index }: { article: MagazineArticle; index: number }) => {
    // Vary card heights for masonry effect
    const cardVariants = [
      'h-auto', // Default height
      'min-h-[300px]', // Taller card
      'h-auto', // Default height
      'min-h-[250px]', // Medium height
    ];
    
    const imageVariants = [
      'aspect-video', // 16:9
      'aspect-[4/5]', // 4:5 Portrait
      'aspect-square', // 1:1
      'aspect-[3/4]', // 3:4 Portrait
    ];

    return (
      <Card 
        className={`cursor-pointer hover:shadow-xl transition-all duration-300 group overflow-hidden ${cardVariants[index % 4]}`}
        onClick={() => navigate(`/magazine/article/${article.slug}`)}
      >
        {article.featuredImage && (
          <div className="relative overflow-hidden">
            <ImageWithLoading
              src={article.featuredImage}
              alt={article.title}
              className={`w-full ${imageVariants[index % 4]} object-cover group-hover:scale-105 transition-transform duration-300`}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {article.category && (
              <Badge 
                variant="secondary" 
                className="absolute top-3 left-3 bg-white/90 text-black backdrop-blur-sm"
              >
                {article.category.name}
              </Badge>
            )}
          </div>
        )}
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{article.readTimeMinutes || 5} min read</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{article.viewCount || 0}</span>
              </div>
            </div>
            <span>{new Date(article.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const MasonryColumn = ({ articles, columnIndex }: { articles: MagazineArticle[]; columnIndex: number }) => (
    <div className="grid gap-4">
      {articles.map((article, index) => (
        <ArticleCard 
          key={article.id} 
          article={article} 
          index={columnIndex * articles.length + index}
        />
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading Magazine</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/10">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            SteppersLife Magazine
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Discover the latest in stepping culture, dance tutorials, event highlights, and inspiring community stories.
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Articles Masonry Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="h-64">
                <Skeleton className="h-40 w-full rounded-t-lg" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {articleColumns.map((columnArticles, columnIndex) => (
              <MasonryColumn 
                key={columnIndex} 
                articles={columnArticles} 
                columnIndex={columnIndex}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">📰</div>
            <h3 className="text-2xl font-semibold mb-4">
              {searchQuery || selectedCategory ? 'No articles found' : 'No articles available'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search criteria or browse all articles.'
                : 'Articles will appear here once they are published by our editors.'
              }
            </p>
            {(searchQuery || selectedCategory) && (
              <div className="space-x-2">
                {searchQuery && (
                  <Button onClick={() => setSearchQuery('')} variant="outline">
                    Clear Search
                  </Button>
                )}
                {selectedCategory && (
                  <Button onClick={() => setSelectedCategory('')} variant="outline">
                    Show All Categories
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Categories Section */}
        {!searchQuery && !selectedCategory && categories.length > 0 && (
          <section className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">Explore Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Card 
                  key={category.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 group text-center p-6"
                  onClick={() => setSelectedCategory(category.slug)}
                >
                  <Book className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {category.articleCount || 0} articles
                  </Badge>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section className="mt-20 text-center bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-12">
          <h3 className="text-3xl font-bold mb-4">Stay Connected</h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto text-lg">
            Join our community of stepping enthusiasts and never miss the latest articles, tutorials, and event coverage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/profile')} className="text-lg px-8">
              Subscribe to Updates
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/events')} className="text-lg px-8">
              Browse Events
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}