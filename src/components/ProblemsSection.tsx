import { AlertTriangle, Clock, TrendingDown } from "lucide-react";

const ProblemsSection = () => {
  const problems = [
    {
      icon: AlertTriangle,
      title: "Manual Chaos at Scale",
      description: "Long queues at the fee counter, endless hours of manual reconciliation, and the security risks of handling cash on premises.",
      color: "text-destructive"
    },
    {
      icon: Clock,
      title: "Administrative Overload", 
      description: "Teachers and staff are buried under non-core tasks like making reminder calls and fielding parent queries, leading to burnout.",
      color: "text-orange-500"
    },
    {
      icon: TrendingDown,
      title: "Lack of Financial Visibility",
      description: "Difficulty in tracking defaulters and making accurate financial plans due to a lack of real-time data.",
      color: "text-red-500"
    }
  ];

  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-primary mb-4">
            Is Your School Facing These Challenges?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every day, schools across India struggle with outdated fee management processes. 
            These challenges are costing you time, money, and peace of mind.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-6`}>
                <problem.icon className={`w-6 h-6 ${problem.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-4">{problem.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{problem.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-2xl mx-auto">
            <p className="text-destructive font-medium">
              These problems don't just affect operations – they impact your school's reputation and financial health.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemsSection;