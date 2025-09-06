import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, FileText, User, Calendar } from "lucide-react";

interface StudentData {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  class: string;
  section: string;
  school_id: string;
}

interface FeeData {
  id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
}

const StudentPortal = () => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [fees, setFees] = useState<FeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedData = sessionStorage.getItem('studentData');
    if (!storedData) {
      navigate('/student-login');
      return;
    }

    const student = JSON.parse(storedData);
    setStudentData(student);
    loadFees(student.id);
  }, [navigate]);

  const loadFees = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: true });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load fee information.",
          variant: "destructive",
        });
        return;
      }

      setFees(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load portal data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (feeId: string) => {
    toast({
      title: "Payment Integration",
      description: "Payment gateway integration will be implemented here.",
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('studentData');
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-hero rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-lg">FC</span>
          </div>
          <p>Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return null;
  }

  const pendingFees = fees.filter(fee => fee.status === 'pending' || fee.status === 'overdue');
  const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">FC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Student Portal</h1>
              <p className="text-sm text-muted-foreground">
                {studentData.first_name} {studentData.last_name}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Fee Summary
                </CardTitle>
                <CardDescription>
                  Overview of your fee payments and pending amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-secondary/10 rounded-lg">
                    <div className="text-2xl font-bold text-secondary">₹{totalPending}</div>
                    <p className="text-sm text-muted-foreground">Total Pending</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      ₹{fees.filter(f => f.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{fees.length}</div>
                    <p className="text-sm text-muted-foreground">Total Fees</p>
                  </div>
                </div>

                {totalPending > 0 && (
                  <div className="mb-4">
                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="w-full"
                      onClick={() => handlePayment('all')}
                    >
                      Pay All Pending Fees (₹{totalPending})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Fee Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No fee records found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {fees.map((fee) => (
                      <div 
                        key={fee.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <h4 className="font-medium">{fee.fee_type}</h4>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(fee.due_date).toLocaleDateString()}
                          </p>
                           {fee.paid_date && (
                             <p className="text-sm text-primary">
                               Paid: {new Date(fee.paid_date).toLocaleDateString()}
                             </p>
                           )}
                        </div>
                        <div className="text-right space-y-2">
                          <div className="font-bold">₹{fee.amount}</div>
                          <Badge variant={getStatusColor(fee.status)}>
                            {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                          </Badge>
                          {fee.status !== 'paid' && (
                            <div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handlePayment(fee.id)}
                              >
                                Pay Now
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{studentData.first_name} {studentData.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admission Number</p>
                  <p className="font-medium">{studentData.admission_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">{studentData.class || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Section</p>
                  <p className="font-medium">{studentData.section || 'Not assigned'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Download Receipt
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Payment History
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;