import { useLocation, Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag } from 'lucide-react'
import { useTheme } from 'next-themes'
import DayNightSwitch from '@/components/ui/DayNightSwitch'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { UserProfile } from '@/components/auth/UserProfile'
import { CartDrawer } from '@/components/cart'
import PWAInstallButton from '@/components/PWAInstallButton'

interface DashboardHeaderProps {
  children?: React.ReactNode
}

export function DashboardHeader({ children }: DashboardHeaderProps) {
  const location = useLocation()
  const { setTheme, resolvedTheme } = useTheme()
  const { user } = useAuth()
  const { totalItems, isCartOpen, setIsCartOpen } = useCart()
  
  const handleThemeToggle = (isDay: boolean) => {
    setTheme(isDay ? 'light' : 'dark')
  }

  // Use resolvedTheme to get the actual theme (system theme resolved)
  const isLightMode = resolvedTheme === 'light'

  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x)
    const breadcrumbs = []

    // Always start with Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
      isLast: pathnames.length <= 1
    })

    // Add subsequent path segments
    for (let i = 1; i < pathnames.length; i++) {
      const href = '/' + pathnames.slice(0, i + 1).join('/')
      const label = pathnames[i].charAt(0).toUpperCase() + pathnames[i].slice(1)
      const isLast = i === pathnames.length - 1

      breadcrumbs.push({
        label: label.replace('-', ' '),
        href,
        isLast
      })
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard'

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border bg-background shadow-sm">
      {/* Top bar with logo and user actions */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/2e635021-dedb-40f2-9817-c404d5bd828d.png" 
              alt="Steppers Life Logo" 
              className="h-8 sm:h-10 w-auto object-contain dark:hidden"
            />
            <img 
              src="/lovable-uploads/6bcc30f5-9623-4562-a26a-1c4b50f3028b.png" 
              alt="Steppers Life Logo" 
              className="h-8 sm:h-10 w-auto object-contain hidden dark:block"
            />
          </Link>
          
          {/* Right: User actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PWA Install Button */}
            <PWAInstallButton 
              variant="ghost" 
              size="sm" 
              showText={false}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0"
            />

            <DayNightSwitch
              checked={isLightMode}
              onToggle={handleThemeToggle}
              className="h-8 sm:h-9 w-16 sm:w-20"
            />

            {/* Cart Icon */}
            <Button
              variant="ghost"
              size="sm"
              className="relative h-8 w-8 sm:h-9 sm:w-9 p-0 touch-manipulation"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag className="h-4 w-4" />
              {totalItems > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs"
                >
                  {totalItems > 99 ? '99+' : totalItems}
                </Badge>
              )}
              <span className="sr-only">Shopping cart</span>
            </Button>
            
            <UserProfile />
          </div>
        </div>
      </div>
      
      {/* Breadcrumb bar */}
      <div className="flex h-16 items-center gap-4 px-4 lg:px-8 bg-background">
        {/* Mobile menu trigger */}
        {children}

        {/* Breadcrumbs */}
        <div className="flex-1 min-h-[4rem] flex flex-col justify-center">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.href} className="flex items-center">
                  <BreadcrumbItem>
                    {breadcrumb.isLast ? (
                      <BreadcrumbPage className="font-medium text-foreground">
                        {breadcrumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href={breadcrumb.href}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {breadcrumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {pageTitle}
          </h1>
        </div>

      </div>
    </header>
    
    {/* Cart Drawer */}
    <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  )
}