import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Booking from "./pages/Booking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Check if homepage should be hidden
  const homepageHidden = import.meta.env.VITE_HOMEPAGE_HIDDEN === 'true';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route 
                path="/" 
                element={homepageHidden ? <Navigate to="/login" replace /> : <Index />} 
              />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute requireRole="customer">
                <Dashboard />
              </ProtectedRoute>
            } />
              <Route path="/admin" element={
                <ProtectedRoute requireRole="admin">
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/booking" element={
                <ProtectedRoute requireRole="customer">
                  <Booking />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
