import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 border-2 border-primary shadow-[0_0_30px_hsl(120_100%_50%/0.2)]">
        <pre className="text-primary text-xs sm:text-sm leading-tight text-center mb-6">
{`╔════════════════════════════════╗
║   KIDCARE MEDICAL TERMINAL     ║
║   AUTHENTICATION REQUIRED      ║
╚════════════════════════════════╝`}
        </pre>
        
        <h1 className="text-2xl uppercase tracking-wider text-center mb-2">
          {isLogin ? "SYSTEM LOGIN" : "NEW USER REGISTRATION"}
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          {isLogin ? "ENTER CREDENTIALS TO ACCESS" : "CREATE NEW OPERATOR ACCOUNT"}
        </p>

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <div>
              <Label htmlFor="fullName" className="text-muted-foreground uppercase">
                OPERATOR NAME:
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="_"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-muted-foreground uppercase">
              EMAIL ADDRESS:
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="_"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-muted-foreground uppercase">
              PASSWORD:
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
              minLength={6}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>PROCESSING<span className="animate-blink">█</span></>
            ) : isLogin ? (
              "[ENTER] LOGIN"
            ) : (
              "[ENTER] REGISTER"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-base text-muted-foreground hover:text-primary transition-colors uppercase"
          >
            {isLogin
              ? "[N] CREATE NEW ACCOUNT"
              : "[L] EXISTING USER LOGIN"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;