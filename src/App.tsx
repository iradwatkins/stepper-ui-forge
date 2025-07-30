
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { HelmetProvider } from "react-helmet-async";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FaviconManager } from "@/components/ui/FaviconManager";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ReferralTracker } from "@/components/tracking/ReferralTracker";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Load admin setup utilities for browser console access
import "@/utils/setupAdmin";


// Loading component for lazy loaded routes
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Lazy load page components for better code splitting
const Index = lazy(() => import("./pages/Index"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Magazine = lazy(() => import("./pages/Magazine"));
const Classes = lazy(() => import("./pages/Classes"));
const CreateClass = lazy(() => import("./pages/CreateClass"));
const EditClass = lazy(() => import("./pages/EditClass"));
const EditBusiness = lazy(() => import("./pages/EditBusiness"));
const Community = lazy(() => import("./pages/Community"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const CreateEventWizard = lazy(() => import("./pages/CreateEventWizard"));
const EditEvent = lazy(() => import("./pages/EditEvent"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const Notifications = lazy(() => import("./pages/dashboard/Notifications"));
const EventsManagement = lazy(() => import("./pages/dashboard/EventsManagement"));
const DraftEvents = lazy(() => import("./pages/dashboard/DraftEvents"));
const ArchivedEvents = lazy(() => import("./pages/dashboard/ArchivedEvents"));
const TicketsOverview = lazy(() => import("./pages/dashboard/TicketsOverview"));
const TicketAnalytics = lazy(() => import("./pages/dashboard/TicketAnalytics"));
const PaymentManagement = lazy(() => import("./pages/dashboard/PaymentManagement"));
const TeamManagement = lazy(() => import("./pages/dashboard/TeamManagement"));
const TeamInvite = lazy(() => import("./pages/dashboard/TeamInvite"));
const TeamRoles = lazy(() => import("./pages/dashboard/TeamRoles"));
const CheckInManagement = lazy(() => import("./pages/dashboard/CheckInManagement"));
const LiveAnalytics = lazy(() => import("./pages/dashboard/LiveAnalytics"));
const AdminUsers = lazy(() => import("./pages/dashboard/admin/AdminUsers"));
const AdminAnalytics = lazy(() => import("./pages/dashboard/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/dashboard/admin/AdminSettings"));
const AdminMonitor = lazy(() => import("./pages/dashboard/admin/AdminMonitor"));
const AdminEvents = lazy(() => import("./pages/dashboard/admin/AdminEvents"));
const DatabaseAdmin = lazy(() => import("./pages/dashboard/admin/DatabaseAdmin"));
const MagazineManagementPage = lazy(() => import("./pages/admin/MagazineManagementPage"));
const CreateArticlePage = lazy(() => import("./pages/admin/CreateArticlePage"));
const EditArticlePage = lazy(() => import("./pages/admin/EditArticlePage"));
const CategoryManagementPage = lazy(() => import("./pages/admin/CategoryManagementPage"));
const ArticleDetailPage = lazy(() => import("./pages/ArticleDetailPage"));
const AdminDashboardOverview = lazy(() => import("./pages/admin/AdminDashboardOverview"));
const EditEventsManage = lazy(() => import("./pages/dashboard/EditEventsManage"));
const Following = lazy(() => import("./pages/dashboard/Following"));
const FollowerManagement = lazy(() => import("./pages/dashboard/FollowerManagement"));
const SalesDashboard = lazy(() => import("./pages/dashboard/SalesDashboard"));
const ReferralCodes = lazy(() => import("./pages/dashboard/ReferralCodes"));
const Earnings = lazy(() => import("./pages/dashboard/Earnings"));
const EventAssignments = lazy(() => import("./pages/dashboard/EventAssignments"));
const Schedule = lazy(() => import("./pages/dashboard/Schedule"));
const AudienceInsights = lazy(() => import("./pages/dashboard/AudienceInsights"));
const VenueManagement = lazy(() => import("./pages/dashboard/VenueManagement"));
const CashPaymentDashboardPage = lazy(() => import("./pages/CashPaymentDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AccountAuth = lazy(() => import("./pages/AccountAuth"));
const PaymentConfiguration = lazy(() => import("./pages/dashboard/admin/PaymentConfiguration"));
const CreateBusiness = lazy(() => import("./pages/CreateBusinessSteps"));
const SellerPayouts = lazy(() => import("./pages/SellerPayouts"));
const PayoutsDashboard = lazy(() => import("./pages/PayoutsDashboard"));
const PayPalCallback = lazy(() => import("./pages/PayPalCallback"));
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));
const SquareOAuthCallback = lazy(() => import("./pages/SquareOAuthCallback"));
const LikedEvents = lazy(() => import("./pages/LikedEvents"));
const QRScanner = lazy(() => import("./pages/QRScanner"));
const EventDebug = lazy(() => import("./pages/EventDebug"));
const MyBusinesses = lazy(() => import("./pages/dashboard/MyBusinesses"));

// Keep Navbar as synchronous since it's always needed
import Navbar from "./components/Navbar";
import { CheckoutModal } from "./components/CheckoutModal";
import { useCart } from "./contexts/CartContext";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isDashboardPage = location.pathname.startsWith('/dashboard');
  const { isCheckoutOpen, checkoutProps, setIsCheckoutOpen } = useCart();
  
  return (
    <div className="min-h-screen bg-background">
      <FaviconManager fallbackFavicon="/steppers-icon.svg" />
      <ReferralTracker />
      {!isHomePage && !isDashboardPage && <Navbar />}
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        {...checkoutProps}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/magazine" element={<Magazine />} />
        <Route path="/magazine/article/:slug" element={<ArticleDetailPage />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/create-class" element={
          <ProtectedRoute>
            <CreateClass />
          </ProtectedRoute>
        } />
        <Route path="/edit-class/:id" element={
          <ProtectedRoute>
            <EditClass />
          </ProtectedRoute>
        } />
        <Route path="/community" element={<Community />} />
        <Route path="/create-business" element={
          <ProtectedRoute>
            <CreateBusiness />
          </ProtectedRoute>
        } />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/create-event" element={
          <ProtectedRoute>
            <CreateEventWizard />
          </ProtectedRoute>
        } />
        <Route path="/create-event-simple" element={
          <ProtectedRoute>
            <CreateEvent />
          </ProtectedRoute>
        } />
        <Route path="/edit-event/:id" element={
          <ProtectedRoute>
            <EditEvent />
          </ProtectedRoute>
        } />
        <Route path="/cash-payments" element={
          <ProtectedRoute>
            <CashPaymentDashboardPage />
          </ProtectedRoute>
        } />
        
        {/* Customer Account Routes */}
        <Route path="/account" element={<AccountAuth />} />
        
        {/* Legacy auth route - redirect to account */}
        <Route path="/auth" element={<AccountAuth />} />
        
        {/* Payment callback routes */}
        <Route path="/payment/paypal/callback" element={<PayPalCallback />} />
        <Route path="/auth/callback" element={<SquareOAuthCallback />} />
        <Route path="/auth/square/callback" element={<SquareOAuthCallback />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="following" element={<Following />} />
          <Route path="followers" element={<FollowerManagement />} />
          <Route path="sales" element={<SalesDashboard />} />
          <Route path="referrals" element={<ReferralCodes />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="assignments" element={<EventAssignments />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="audience" element={<AudienceInsights />} />
          <Route path="events" element={<EventsManagement />} />
          <Route path="events/manage" element={<EditEventsManage />} />
          <Route path="events/edit/:id" element={<EditEvent />} />
          <Route path="events/drafts" element={<DraftEvents />} />
          <Route path="events/archived" element={<ArchivedEvents />} />
          <Route path="venues" element={<VenueManagement />} />
          <Route path="tickets" element={<TicketsOverview />} />
          <Route path="tickets/:id" element={<TicketsOverview />} />
          <Route path="tickets/analytics" element={<TicketAnalytics />} />
          <Route path="tickets/payments" element={<PaymentManagement />} />
          <Route path="team" element={<TeamManagement />} />
          <Route path="team/invite" element={<TeamInvite />} />
          <Route path="team/roles" element={<TeamRoles />} />
          <Route path="checkin" element={<CheckInManagement />} />
          <Route path="analytics" element={<LiveAnalytics />} />
          <Route path="seller-payouts" element={<SellerPayouts />} />
          <Route path="payouts" element={<PayoutsDashboard />} />
          <Route path="liked" element={<LikedEvents />} />
          <Route path="tickets" element={<MyTickets />} />
          <Route path="scanner" element={<QRScanner />} />
          <Route path="businesses" element={<MyBusinesses />} />
          <Route path="businesses/create" element={<CreateBusiness />} />
          <Route path="businesses/edit/:id" element={<EditBusiness />} />
          {/* Admin routes within dashboard */}
          <Route path="admin" element={
            <AdminRoute>
              <AdminDashboardOverview />
            </AdminRoute>
          } />
          <Route path="admin/events" element={
            <AdminRoute>
              <AdminEvents />
            </AdminRoute>
          } />
          <Route path="admin/users" element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } />
          <Route path="admin/analytics" element={
            <AdminRoute>
              <AdminAnalytics />
            </AdminRoute>
          } />
          <Route path="admin/settings" element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          } />
          <Route path="admin/monitor" element={
            <AdminRoute>
              <AdminMonitor />
            </AdminRoute>
          } />
          <Route path="admin/database" element={
            <AdminRoute>
              <DatabaseAdmin />
            </AdminRoute>
          } />
          <Route path="admin/payments" element={
            <AdminRoute>
              <PaymentConfiguration />
            </AdminRoute>
          } />
          <Route path="admin/magazine" element={
            <AdminRoute>
              <MagazineManagementPage />
            </AdminRoute>
          } />
          <Route path="admin/magazine/create" element={
            <AdminRoute>
              <CreateArticlePage />
            </AdminRoute>
          } />
          <Route path="admin/magazine/edit/:id" element={
            <AdminRoute>
              <EditArticlePage />
            </AdminRoute>
          } />
          <Route path="admin/magazine/categories" element={
            <AdminRoute>
              <CategoryManagementPage />
            </AdminRoute>
          } />
        </Route>
        
        {/* Admin Portal Redirect - consolidate to dashboard admin */}
        <Route path="/admin" element={<AdminAuth />} />
        
        {/* Auth Test Page */}
        
        {/* Event Debug Page */}
        <Route path="/event-debug" element={
          <Suspense fallback={<PageLoader />}>
            <EventDebug />
          </Suspense>
        } />
        
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => {
  // Note: Removed aggressive timer clearing as it was interfering with PayPal/CashApp
  // Payment system issues should be handled by individual components

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <AuthProvider>
              <CartProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
                <SpeedInsights />
              </CartProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
