
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { IssueProvider } from "@/contexts/IssueContext";
import { UserProvider } from "@/contexts/UserContext";
import Index from "./pages/Index";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { TicketResolverPage } from "./pages/TicketResolverPage";
import { ResolutionApproverPage } from "./pages/ResolutionApproverPage";
import { WorkforcePage } from "./pages/WorkforcePage";
import TrackTicket from "./pages/TrackTicket";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <IssueProvider>
          <UserProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/ticket-resolver" element={<TicketResolverPage />} />
                <Route path="/resolution-approver" element={<ResolutionApproverPage />} />
                <Route path="/invigilator" element={<WorkforcePage />} />
                <Route path="/track/:ticketNumber" element={<TrackTicket />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </UserProvider>
        </IssueProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
