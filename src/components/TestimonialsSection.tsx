import { Quote, Star } from "lucide-react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "FeeClub helped us modernize our entire fee process. It's affordable, easy to implement, and our administrative staff is finally free from burnout. Parents are happier too!",
      author: "Dr. Rajesh Kumar",
      position: "Director",
      school: "Modern Scholars Academy, Jaipur",
      rating: 5,
      type: "Digital Adopter"
    },
    {
      quote: "We were hesitant to move away from our ledgers, but FeeClub made it simple. The reduction in manual workload is drastic. Our collections are faster, and everything is secure and properly recorded.",
      author: "Mrs. Priya Sharma",
      position: "Principal", 
      school: "Vivekananda Public School, Sonipat",
      rating: 5,
      type: "Traditional Stalwart"
    }
  ];

  return (
    <section id="testimonials" className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-primary mb-4">
            Why Modern Schools in India Choose FeeClub
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Don't just take our word for it. Here's what school leaders are saying about their transformation.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-shadow relative">
              <Quote className="w-8 h-8 text-success/30 absolute top-6 left-6" />
              
              <div className="flex items-center mb-4 ml-12">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-success text-success" />
                ))}
              </div>

              <blockquote className="text-lg text-muted-foreground leading-relaxed mb-6 ml-12">
                "{testimonial.quote}"
              </blockquote>

              <div className="flex items-center space-x-4 ml-12">
                <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-primary">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.position}</div>
                  <div className="text-sm text-success font-medium">{testimonial.school}</div>
                </div>
              </div>

              <div className="absolute top-4 right-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  testimonial.type === "Digital Adopter" 
                    ? "bg-success/10 text-success" 
                    : "bg-primary/10 text-primary"
                }`}>
                  {testimonial.type}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="bg-muted/50 border border-border rounded-lg p-6 max-w-2xl mx-auto">
            <p className="text-muted-foreground">
              <strong className="text-primary">Join 500+ schools</strong> across India that have transformed their fee management with FeeClub.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;