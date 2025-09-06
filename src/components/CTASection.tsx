import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, ArrowRight } from "lucide-react";

const CTASection = () => {
  const benefits = [
    "See live demo of the platform",
    "Get personalized implementation plan", 
    "Understand pricing for your school size",
    "Ask questions to our education experts"
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary to-primary-light text-primary-foreground">
      <div className="container mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Ready to Digitize Your Fee Collection?
          </h2>
          <p className="text-xl mb-12 text-primary-foreground/90 leading-relaxed">
            Schedule a short, no-obligation demo with our team to see how FeeClub 
            can transform your school's financial operations in just 15 minutes.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 text-left">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-success" />
                What You'll Get in the Demo:
              </h3>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-primary-foreground/90">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-success/20 backdrop-blur-sm rounded-xl p-6 text-left">
              <h3 className="text-xl font-semibold mb-4">Demo Details:</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-primary-foreground/90">Duration:</span>
                  <span className="font-medium">15-20 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-foreground/90">Format:</span>
                  <span className="font-medium">Live online demo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-foreground/90">Cost:</span>
                  <span className="font-medium text-success">Completely Free</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-foreground/90">Commitment:</span>
                  <span className="font-medium">No obligation</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Button 
              variant="secondary" 
              size="lg" 
              className="text-xl px-12 py-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              Schedule My Free Demo
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
            
            <p className="text-sm text-primary-foreground/70">
              Preferred demo times: Monday-Saturday, 10 AM - 6 PM IST
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;