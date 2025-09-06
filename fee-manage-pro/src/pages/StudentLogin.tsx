import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, GraduationCap } from "lucide-react";

interface City {
  id: string;
  name: string;
}

interface School {
  id: string;
  name: string;
  city_id: string;
}

const StudentLogin = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      loadSchools();
    } else {
      setSchools([]);
      setSelectedSchool("");
    }
  }, [selectedCity]);

  const loadCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load cities. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setCities(data || []);
  };

  const loadSchools = async () => {
    if (!selectedCity) return;

    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('city_id', selectedCity)
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load schools. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setSchools(data || []);
  };

  const handleProceed = () => {
    if (!selectedCity || !selectedSchool) {
      toast({
        title: "Selection Required",
        description: "Please select both city and school to continue.",
        variant: "destructive",
      });
      return;
    }

    const selectedSchoolData = schools.find(s => s.id === selectedSchool);
    navigate('/student-credentials', { 
      state: { 
        schoolId: selectedSchool, 
        schoolName: selectedSchoolData?.name 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/login')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login Options
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-secondary" />
            </div>
            <CardTitle className="text-2xl">Select Your School</CardTitle>
            <CardDescription>
              Choose your city and school to access the student portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select School</label>
              <Select 
                value={selectedSchool} 
                onValueChange={setSelectedSchool}
                disabled={!selectedCity}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={selectedCity ? "Choose your school" : "Select city first"} 
                  />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleProceed}
              className="w-full" 
              disabled={!selectedCity || !selectedSchool || loading}
            >
              Proceed to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentLogin;