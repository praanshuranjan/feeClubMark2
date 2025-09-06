import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-admin.jpg";

const HeroSection = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-background via-secondary/30 to-accent/10">
      <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-6xl font-bold text-primary leading-tight">
              Effortless Fee Management for 
              <span className="text-success"> Modern Indian Schools</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg">
              Stop chasing fees manually. Reduce administrative workload by over 20 hours a week, 
              improve cash flow, and give parents the modern payment experience they expect.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="lg" className="text-lg px-8 py-6">
              Book a Free Demo
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Watch Video
            </Button>
          </div>

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span>No setup fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span>Indian schools trusted</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <img 
            src={heroImage} 
            alt="School administrator using FeeClub dashboard"
            className="rounded-2xl shadow-2xl w-full h-auto"
          />
          <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="text-2xl font-bold text-success">₹2.4L+</div>
            <div className="text-sm text-muted-foreground">Collected this month</div>
          </div>
          <div className="absolute -top-6 -right-6 bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="text-2xl font-bold text-primary">95%</div>
            <div className="text-sm text-muted-foreground">Collection efficiency</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;