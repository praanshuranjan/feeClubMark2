import { Bell, Shield, BarChart3, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const FeaturesSection = () => {
  const features = [
    {
      icon: Bell,
      title: "Automated Reminders",
      description: "Eliminate follow-up calls. Send automated fee reminders via SMS, Email, and WhatsApp to ensure timely payments.",
      benefits: ["Reduce staff workload by 80%", "Improve collection rates", "Professional communication"]
    },
    {
      icon: Shield,
      title: "Secure Digital Payments",
      description: "Accept payments via UPI, Cards, Net Banking, and more. All transactions are secure, and receipts are generated instantly.",
      benefits: ["Bank-grade security", "Instant receipts", "Multiple payment options"]
    },
    {
      icon: BarChart3,
      title: "Centralized Dashboard",
      description: "Gain complete control and visibility over your school's finances. Track collections, view outstanding fees, and generate reports with one click.",
      benefits: ["Real-time insights", "Custom reports", "Financial forecasting"]
    },
    {
      icon: Smartphone,
      title: "Modern Parent App",
      description: "Enhance your school's brand image by offering parents a simple, professional mobile app to pay fees and view their payment history.",
      benefits: ["Better parent experience", "Enhanced school image", "Reduced queries"]
    }
  ];

  return (
    <section id="features" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-primary mb-4">
            The All-in-One Solution to Secure Your School's Finances
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your fee management with our comprehensive platform designed specifically for Indian schools.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {features.map((feature, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start space-x-6">
                <div className="w-16 h-16 bg-gradient-success rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-8 h-8 text-success-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-primary mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, bIndex) => (
                      <li key={bIndex} className="flex items-center space-x-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 rounded-xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-primary mb-4">Ready to Transform Your Fee Management?</h3>
            <p className="text-muted-foreground mb-6">
              Join hundreds of schools that have already streamlined their operations and improved their financial health.
            </p>
            <Button variant="success" size="lg" className="text-lg px-8 py-6">
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;