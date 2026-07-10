import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, User, Building2 } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import logo from "@/assets/logo.png";

type AccountType = "personal" | "professional";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTab = searchParams.get("redirect");
  const { signIn, signUp, resetPassword, updatePassword, user, loading, isRecovery } = useAuth();
  const { toast } = useToast();

  const dashboardPath = redirectTab ? `/dashboard?tab=${redirectTab}&welcome=true` : "/dashboard?welcome=true";

  useEffect(() => {
    if (user && !isRecovery) {
      navigate(dashboardPath);
    }
  }, [user, isRecovery, navigate, dashboardPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (!error) {
        navigate(dashboardPath);
      }
    } else {
      // Validation
      if (!accountType) {
        toast({ title: "Error", description: "Please select an account type", variant: "destructive" });
        return;
      }
      if (!firstName.trim() || !lastName.trim()) {
        toast({ title: "Error", description: "First and last name are required", variant: "destructive" });
        return;
      }
      if (password.length < 8) {
        toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
        return;
      }
      if (!agreeTerms) {
        toast({ title: "Error", description: "You must agree to the Terms & Conditions", variant: "destructive" });
        return;
      }
      if (accountType === "professional" && !companyName.trim()) {
        toast({ title: "Error", description: "Company name is required for professional accounts", variant: "destructive" });
        return;
      }

      const { error } = await signUp(email, password, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        account_type: accountType,
        company_name: accountType === "professional" ? companyName.trim() : null,
        vat_number: accountType === "professional" ? vatNumber.trim() || null : null,
      });
      if (!error) {
        setIsLogin(true);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFirstName("");
        setLastName("");
        setCompanyName("");
        setVatNumber("");
        setAccountType(null);
        setAgreeTerms(false);
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const { error } = await resetPassword(email);
    if (!error) {
      setResetSent(true);
      toast({
        title: "Email sent",
        description: "We've sent a password reset link to your email.",
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    const { error } = await updatePassword(newPassword);
    if (!error) {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-navy-light to-primary">
        <div className="animate-spin h-8 w-8 border-4 border-gold border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const showSignupForm = !isLogin && accountType;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      
      <div className="relative z-10 p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center mb-6">
              <img 
                src={logo} 
                alt="BloodstockAI" 
                className="h-24 md:h-32 w-auto object-contain drop-shadow-lg" 
              />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {isRecovery
                ? "Set new password"
                : isForgotPassword 
                  ? "Reset password" 
                  : isLogin 
                    ? "Welcome back" 
                    : accountType 
                      ? "Create your account"
                      : "Choose account type"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isRecovery
                ? "Enter your new password below"
                : isForgotPassword
                  ? "Enter your email to receive a reset link"
                  : isLogin 
                    ? "Enter your credentials to access your dashboard" 
                    : accountType
                      ? "Start making smarter bloodstock decisions today"
                      : "Select how you'll use BloodstockAI"}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
            {isRecovery ? (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-foreground">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-foreground">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-background/50"
                  />
                </div>
                <Button type="submit" variant="premium" className="w-full" size="lg">
                  Update Password
                </Button>
              </form>
            ) : isForgotPassword ? (
              resetSent ? (
                <div className="space-y-6 text-center">
                  <p className="text-foreground">
                    We've sent a password reset link to your email.
                  </p>
                  <Button
                    type="button"
                    variant="premium"
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSent(false);
                      setEmail("");
                    }}
                  >
                    Back to login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <Button type="submit" variant="premium" className="w-full" size="lg">
                    Send reset link
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setEmail("");
                    }}
                    className="w-full text-sm text-muted-foreground hover:text-secondary transition-colors"
                  >
                    Back to login
                  </button>
                </form>
              )
            ) : isLogin ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-background/50"
                    />
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-secondary hover:text-secondary/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button type="submit" variant="premium" className="w-full" size="lg">
                    Enter Platform
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                  >
                    Don't have an account?{" "}
                    <span className="font-semibold text-secondary">Sign up</span>
                  </button>
                </div>
              </>
            ) : !accountType ? (
              /* Step 1: Account type selection */
              <div className="space-y-4">
                <button
                  onClick={() => setAccountType("personal")}
                  className="w-full border border-border hover:border-secondary rounded-xl p-5 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground group-hover:text-secondary transition-colors">Personal Use</p>
                      <p className="text-xs text-muted-foreground">Individual breeder, owner or enthusiast</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAccountType("professional")}
                  className="w-full border border-border hover:border-secondary rounded-xl p-5 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground group-hover:text-secondary transition-colors">Professional Use</p>
                      <p className="text-xs text-muted-foreground">Agency, stud farm, bloodstock professional or business</p>
                    </div>
                  </div>
                </button>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                  >
                    Already have an account?{" "}
                    <span className="font-semibold text-secondary">Login</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Signup form */
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {accountType === "professional" && (
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-foreground">Company Name</Label>
                      <Input
                        id="company"
                        type="text"
                        placeholder="Your company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="bg-background/50"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-foreground">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="bg-background/50"
                    />
                  </div>

                  {accountType === "professional" && (
                    <div className="space-y-2">
                      <Label htmlFor="vat" className="text-foreground">VAT Number (optional)</Label>
                      <Input
                        id="vat"
                        type="text"
                        placeholder="e.g. IE1234567T"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        className="bg-background/50"
                      />
                      <p className="text-[10px] text-muted-foreground">Enter your VAT number for reverse charge if applicable</p>
                    </div>
                  )}

                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="terms"
                      checked={agreeTerms}
                      onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                      className="mt-0.5 border-border"
                    />
                    <Label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                      I agree to the <Link to="/terms" className="text-secondary hover:underline">Terms & Conditions</Link>
                    </Label>
                  </div>

                  <Button type="submit" variant="premium" className="w-full" size="lg">
                    Create Account
                  </Button>
                </form>

                <div className="mt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setAccountType(null)}
                    className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsLogin(true); setAccountType(null); }}
                    className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                  >
                    Already have an account? <span className="font-semibold text-secondary">Login</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
