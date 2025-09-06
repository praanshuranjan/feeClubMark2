const SocialProof = () => {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4 text-center">
        <p className="text-muted-foreground mb-8 font-medium">
          Trusted by leading schools in Haryana, Rajasthan, and Uttar Pradesh
        </p>
        <div className="flex items-center justify-center space-x-12 opacity-60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded"></div>
            <span className="font-medium text-primary">CBSE Board</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-success rounded"></div>
            <span className="font-medium text-primary">State Boards</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-accent rounded"></div>
            <span className="font-medium text-primary">Private Schools</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;