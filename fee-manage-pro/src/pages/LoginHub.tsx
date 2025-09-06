import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Shield } from "lucide-react";

const LoginHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">FC</span>
            </div>
            <span className="text-3xl font-bold text-primary">FeeClub</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to FeeClub</h1>
          <p className="text-muted-foreground">Please select your login type to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin-login')}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">For School Management</CardTitle>
              <CardDescription>Admin Login Portal</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Access your school's administrative dashboard to manage students, fees, and school operations.
              </p>
              <Button variant="outline" className="w-full">
                Admin Login →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/student-login')}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                <GraduationCap className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="text-xl">For Parents & Students</CardTitle>
              <CardDescription>Pay Fees & View Records</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                View fee details, payment history, and make secure online payments for your child's education.
              </p>
              <Button variant="secondary" className="w-full">
                Student Portal →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginHub;