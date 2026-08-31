import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Sparkles,
  ArrowRight,
  Zap,
  Crown,
  Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Basic",
      icon: Zap,
      price: "₹299",
      period: "/Student/Year",
      description: "Perfect for small schools getting started",
      features: [
        "Attendance management",
        "Homework & Notes",
        "Timetable",
        "Exams & Reports",
        "Certificates",
        "Parent & Student Apps",
        "Email support",
      ],
      notIncluded: [
        "WhatsApp Absent Alerts",
        "WhatsApp Fee Reminders",
        "WhatsApp Announcements",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Standard",
      icon: Crown,
      price: "₹399",
      period: "/Student/Year",
      description: "Most popular choice for growing schools",
      features: [
        "Everything in Basic",
        "WhatsApp Absent Alerts (1,000/mo)",
        "Custom branding",
      ],
      notIncluded: [
        "WhatsApp Fee Reminders",
        "WhatsApp Announcements",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Premium",
      icon: Building2,
      price: "₹499",
      period: "/Student/Year",
      description: "Complete solution for large institutions",
      features: [
        "Everything in Standard",
        "WhatsApp Fee Reminders",
        "WhatsApp Announcements",
        "3,000 msgs/month",
        "Priority support",
        "Dedicated support",
      ],
      notIncluded: [],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "Is there a free trial?",
      answer: "Yes! All plans come with a 14-day free trial. No credit card required to start."
    },
    {
      question: "Can I change plans later?",
      answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect in the next billing cycle."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit/debit cards, UPI, net banking, and bank transfers for annual subscriptions."
    },
    {
      question: "How is pricing calculated?",
      answer: "Pricing is per student per year. You only pay for the number of students enrolled in your school."
    },
    {
      question: "Do you offer discounts for non-profit schools?",
      answer: "Yes, we offer special pricing for registered non-profit educational institutions. Contact us for details."
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Simple Pricing
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Choose Your Perfect{" "}
              <span className="gradient-text">Plan</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transparent pricing with no hidden fees. Start free and scale as you grow.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <Card className={`p-8 h-full flex flex-col ${
                    plan.popular 
                      ? "border-primary shadow-lg shadow-primary/20" 
                      : "border-border/50"
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        plan.popular 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>
                    
                    <div className="flex-1">
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                            <span className="text-foreground">{feature}</span>
                          </li>
                        ))}
                        {plan.notIncluded.map((feature, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="h-4 w-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "gradient" : "outline"}
                      onClick={() => navigate('/auth')}
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Got questions? We've got answers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 h-full">
                  <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </Card>
              </motion.div>
            ))}
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
                Still Have Questions?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Our team is here to help you find the perfect plan for your school.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="xl" variant="secondary" onClick={() => navigate('/contact')}>
                  Contact Sales
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
