
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from "sonner";
import { useAuth } from '@/lib/authProvider';
import { supabase } from '@/integrations/supabase/client';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, user } = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard page
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await signUp(email, password, { full_name: fullName });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Registration successful! Please check your email to verify your account.');
        navigate('/sign-in');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to register.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) {
        toast.error(error.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="w-full p-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">Smart Grid Dashboard</Link>
        <ThemeToggle />
      </header>
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Register to access the Smart Grid Dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  type="text" 
                  placeholder="John Doe" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your.email@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={6}
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                  minLength={6}
                  className="bg-background"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Register'}
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 bg-background hover:bg-secondary transition-colors" 
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-primary rounded-full"></div>
              ) : (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
                </svg>
              )}
              <span>{googleLoading ? 'Connecting...' : 'Sign up with Google'}</span>
            </Button>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center">
              Already have an account?{' '}
              <Link to="/sign-in" className="text-primary underline hover:text-primary/80">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Register;
