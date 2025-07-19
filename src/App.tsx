
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { IssueProvider } from "@/contexts/IssueContext";
import Index from "./pages/Index";
import { LoginPage } from "./pages/LoginPage";
import { AdminPageSimple } from "./pages/AdminPageSimple";
import { InvigilatorPage } from "./pages/InvigilatorPage";
import { ResolutionApproverPage } from "./pages/ResolutionApproverPage";
import { TicketResolverPage } from "./pages/TicketResolverPage";
import TrackTicket from "./pages/TrackTicket";
import { WorkforcePage } from "./pages/WorkforcePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <IssueProvider>
          <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/admin" element={<AdminPageSimple />} />
                  <Route path="/invigilator" element={<InvigilatorPage />} />
                  <Route path="/approver" element={<ResolutionApproverPage />} />
                  <Route path="/resolver" element={<TicketResolverPage />} />
                  <Route path="/track" element={<TrackTicket />} />
                  <Route path="/workforce" element={<WorkforcePage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
          </BrowserRouter>
        </IssueProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
