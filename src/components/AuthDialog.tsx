
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthDialog: React.FC<AuthDialogProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    onOpenChange(false);
    navigate('/sign-in');
  };

  const handleRegister = () => {
    onOpenChange(false);
    navigate('/register');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
          <DialogDescription>
            You need to sign in or create an account to upload and analyze your own data.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 py-4">
          <Button onClick={handleSignIn} className="w-full flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
          <Button onClick={handleRegister} variant="outline" className="w-full flex items-center justify-center gap-2">
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
