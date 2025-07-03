
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/DashboardHome";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import MyTickets from "./pages/MyTickets";
import Notifications from "./pages/dashboard/Notifications";
import EventsManagement from "./pages/dashboard/EventsManagement";
import DraftEvents from "./pages/dashboard/DraftEvents";
import ArchivedEvents from "./pages/dashboard/ArchivedEvents";
import TicketsOverview from "./pages/dashboard/TicketsOverview";
import TicketAnalytics from "./pages/dashboard/TicketAnalytics";
import PaymentManagement from "./pages/dashboard/PaymentManagement";
import TeamManagement from "./pages/dashboard/TeamManagement";
import TeamInvite from "./pages/dashboard/TeamInvite";
import TeamRoles from "./pages/dashboard/TeamRoles";
import CheckInManagement from "./pages/dashboard/CheckInManagement";
import LiveAnalytics from "./pages/dashboard/LiveAnalytics";
import AdminUsers from "./pages/dashboard/admin/AdminUsers";
import AdminAnalytics from "./pages/dashboard/admin/AdminAnalytics";
import AdminSettings from "./pages/dashboard/admin/AdminSettings";
import AdminMonitor from "./pages/dashboard/admin/AdminMonitor";
import AdminEvents from "./pages/dashboard/admin/AdminEvents";
import EditEventsManage from "./pages/dashboard/EditEventsManage";
import Following from "./pages/dashboard/Following";
import FollowerManagement from "./pages/dashboard/FollowerManagement";
import SalesDashboard from "./pages/dashboard/SalesDashboard";
import ReferralCodes from "./pages/dashboard/ReferralCodes";
import Earnings from "./pages/dashboard/Earnings";
import EventAssignments from "./pages/dashboard/EventAssignments";
import Schedule from "./pages/dashboard/Schedule";
import AudienceInsights from "./pages/dashboard/AudienceInsights";
import PaymentTestPage from "./pages/PaymentTest";
import CashPaymentDashboardPage from "./pages/CashPaymentDashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Navbar from "./components/Navbar";

const queryClient = new QueryClient();

function ConditionalNavbar() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  
  if (isDashboard) {
    return null;
  }
  
  return <Navbar />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <div className="min-h-screen bg-background">
              <ConditionalNavbar />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/my-tickets" element={<MyTickets />} />
                <Route path="/payment-test" element={<PaymentTestPage />} />
                <Route path="/create-event" element={
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
                  <Route path="tickets" element={<TicketsOverview />} />
                  <Route path="tickets/:id" element={<TicketsOverview />} />
                  <Route path="tickets/analytics" element={<TicketAnalytics />} />
                  <Route path="tickets/payments" element={<PaymentManagement />} />
                  <Route path="team" element={<TeamManagement />} />
                  <Route path="team/invite" element={<TeamInvite />} />
                  <Route path="team/roles" element={<TeamRoles />} />
                  <Route path="checkin" element={<CheckInManagement />} />
                  <Route path="analytics" element={<LiveAnalytics />} />
                  {/* Admin routes within dashboard */}
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
                </Route>
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
