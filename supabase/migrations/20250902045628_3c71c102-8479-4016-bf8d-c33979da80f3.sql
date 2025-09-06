-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'parent', 'student');

-- Create cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create schools table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city_id UUID REFERENCES public.cities(id) NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create school_admins table
CREATE TABLE public.school_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, school_id)
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  admission_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  class TEXT,
  section TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(school_id, admission_number)
);

-- Create student_fees table
CREATE TABLE public.student_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  fee_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cities (public read access)
CREATE POLICY "Cities are viewable by everyone" ON public.cities
  FOR SELECT USING (true);

-- RLS Policies for schools (public read access for basic info)
CREATE POLICY "Schools are viewable by everyone" ON public.schools
  FOR SELECT USING (true);

-- RLS Policies for school_admins
CREATE POLICY "Admins can view their own records" ON public.school_admins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert their own records" ON public.school_admins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for students
CREATE POLICY "Students data viewable by school admins" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_admins sa 
      WHERE sa.user_id = auth.uid() AND sa.school_id = students.school_id
    )
  );

CREATE POLICY "School admins can manage students" ON public.students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.school_admins sa 
      WHERE sa.user_id = auth.uid() AND sa.school_id = students.school_id
    )
  );

-- RLS Policies for student_fees
CREATE POLICY "Fee data viewable by school admins" ON public.student_fees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_admins sa 
      JOIN public.students s ON s.school_id = sa.school_id
      WHERE sa.user_id = auth.uid() AND s.id = student_fees.student_id
    )
  );

-- Insert sample data for testing
INSERT INTO public.cities (name) VALUES 
  ('Sonipat'), 
  ('Jaipur'), 
  ('Lucknow');

-- Insert sample schools
INSERT INTO public.schools (name, city_id) 
SELECT 
  school_name, 
  c.id 
FROM (
  VALUES 
    ('Delhi Public School', 'Sonipat'),
    ('Ryan International School', 'Sonipat'),
    ('Maharaja Agrasen Model School', 'Jaipur'),
    ('Sanskar School', 'Jaipur'),
    ('City Montessori School', 'Lucknow'),
    ('La Martiniere College', 'Lucknow')
) AS schools(school_name, city_name)
JOIN public.cities c ON c.name = city_name;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_fees_updated_at
  BEFORE UPDATE ON public.student_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();