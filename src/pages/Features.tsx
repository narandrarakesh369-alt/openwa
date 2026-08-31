import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  CreditCard, 
  MessageSquare, 
  BarChart3,
  Users,
  Shield,
  Bell,
  Calendar,
  FileText,
  Bus,
  Award,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

const Features = () => {
  const navigate = useNavigate();

  const mainFeatures = [
    { 
      icon: BookOpen, 
      title: "Smart Attendance", 
      description: "AI-powered attendance tracking with real-time parent notifications via WhatsApp and push notifications.",
      benefits: ["Automated tracking", "Parent alerts", "Attendance reports"]
    },
    { 
      icon: CreditCard, 
      title: "Fee Management", 
      description: "Complete fee collection system with installments, discounts, fines, and automated payment reminders.",
      benefits: ["Installment plans", "Auto reminders", "Receipt generation"]
    },
    { 
      icon: BarChart3, 
      title: "Analytics Dashboard", 
      description: "Comprehensive insights with beautiful visualizations for attendance, academics, and financials.",
      benefits: ["Real-time data", "Custom reports", "Export options"]
    },
    { 
      icon: Users, 
      title: "Multi-role Access", 
      description: "Tailored experiences for super admins, school admins, teachers, students, and parents.",
      benefits: ["Role-based access", "Custom dashboards", "Secure login"]
    },
    { 
      icon: MessageSquare, 
      title: "Instant Notifications", 
      description: "WhatsApp integration and push notifications for important updates and announcements.",
      benefits: ["WhatsApp alerts", "Push notifications", "Email updates"]
    },
    { 
      icon: Shield, 
      title: "Enterprise Security", 
      description: "Bank-grade encryption with row-level security policies for complete data protection.",
      benefits: ["Data encryption", "RLS policies", "Audit logs"]
    },
  ];

  const additionalFeatures = [
    { icon: Calendar, title: "Timetable Management", description: "Create and manage class schedules with conflict detection" },
    { icon: FileText, title: "Exam & Marks", description: "Conduct exams, enter marks, and generate report cards" },
    { icon: Bus, title: "Transport Management", description: "Track routes, stops, vehicles, and student transport assignments" },
    { icon: Award, title: "Certificates", description: "Issue academic and participation certificates with custom templates" },
    { icon: Bell, title: "Announcements", description: "Broadcast important updates to specific audience groups" },
    { icon: Clock, title: "Leave Management", description: "Teachers can apply for leave with admin approval workflow" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Powerful Features
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Everything You Need for{" "}
              <span className="gradient-text">Modern Education</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Comprehensive tools designed to simplify school management, enhance communication, 
              and deliver exceptional educational experiences.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-16 px-6 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="p-6 h-full card-hover border-border/50 bg-card/50 backdrop-blur-sm">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-success" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              And Much More...
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Additional features to cover every aspect of school management.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-12 text-center"
            style={{ background: 'var(--gradient-hero)' }}
          >
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4">
                Ready to Experience These Features?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Start today and see how ArchEdu transforms your institution.
              </p>
              <Button size="xl" variant="secondary" onClick={() => navigate('/auth')}>
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
