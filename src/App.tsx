import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import Index from "./pages/Index";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Classes from "./pages/Classes";
import Subjects from "./pages/Subjects";
import Homework from "./pages/Homework";
import Attendance from "./pages/Attendance";
import Users from "./pages/Users";
import Students from "./pages/Students";
import Schools from "./pages/Schools";
import Enrollment from "./pages/Enrollment";
import Fees from "./pages/Fees";
import Timetable from "./pages/Timetable";
import Reports from "./pages/Reports";
import Announcements from "./pages/Announcements";
import Messages from "./pages/Messages";
import Certificates from "./pages/Certificates";

import Exams from "./pages/Exams";
import Marks from "./pages/Marks";
import Staff from "./pages/Staff";
import Salary from "./pages/Salary";
import Membership from "./pages/Membership";
import ParentStudentRelations from "./pages/ParentStudentRelations";
import StudentPortal from "./pages/StudentPortal";
import Transport from "./pages/Transport";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup" element={<Setup />} />
          
          {/* Main Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Student Management Routes */}
          <Route path="/students" element={<Students />} />
          <Route path="/students/add" element={<Students />} />
          <Route path="/students/print" element={<Students />} />
          <Route path="/students/manage-login" element={<Students />} />
          <Route path="/students/promote" element={<Students />} />
          
          {/* Staff/Employee Management Routes */}
          <Route path="/staff" element={<Staff />} />
          <Route path="/staff/add" element={<Staff />} />
          <Route path="/staff/id-cards" element={<Staff />} />
          <Route path="/staff/manage-login" element={<Staff />} />
          
          {/* Class Management Routes */}
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/new" element={<Classes />} />
          
          {/* Attendance Routes */}
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/attendance/class-report" element={<Attendance />} />
          <Route path="/attendance/student-report" element={<Attendance />} />
          
          {/* Academic Routes */}
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/homework" element={<Homework />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/marks" element={<Marks />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/certificates" element={<Certificates />} />
          
          {/* Financial Routes */}
          <Route path="/fees" element={<Fees />} />
          <Route path="/salary" element={<Salary />} />
          
          {/* Communication Routes */}
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/messages" element={<Messages />} />
          
          {/* Admin Routes */}
          <Route path="/schools" element={<Schools />} />
          <Route path="/users" element={<Users />} />
          <Route path="/enrollment" element={<Enrollment />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/parent-student-relations" element={<ParentStudentRelations />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/notifications" element={<Notifications />} />
          
          
          {/* Student Portal Routes */}
          <Route path="/student/*" element={<StudentPortal />} />
          
          {/* 404 Catch-all - MUST BE LAST */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
