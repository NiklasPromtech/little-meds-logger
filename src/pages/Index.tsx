import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pill, Activity, FileText, Brain, Users, Bell, RefreshCw, Heart, Shield, Clock } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [typedText, setTypedText] = useState("");
  const fullText = "WAS THAT THE FIRST DOSE OR THE SECOND?";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pt-[var(--safe-area-inset-top)] pb-[var(--safe-area-inset-bottom)] pl-[var(--safe-area-inset-left)] pr-[var(--safe-area-inset-right)]">
      {/* Header */}
      <header className="container mx-auto px-4 py-4 border-b border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">[LOG]</span>
          </div>
          <Button 
            onClick={() => navigate("/auth")} 
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            SIGN IN
          </Button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-primary mb-4 font-mono">&gt; SYSTEM ONLINE_</p>
          
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-6 min-h-[2.5em] md:min-h-[1.5em]">
            "{typedText}<span className="cursor-blink">_</span>"
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            You'll never have to ask yourself that again.
          </p>
          
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")} 
            className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 mb-4"
          >
            START TRACKING FREE
          </Button>
          
          <p className="text-muted-foreground text-sm">
            100% Free. No card needed. Ever.
          </p>
        </section>

        {/* The 3AM Problem Section */}
        <section className="border-y border-primary/30 bg-muted/20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-8">
              <p className="text-primary font-mono mb-2">════════════════════════════════════════</p>
              <h2 className="text-2xl md:text-3xl font-bold text-amber-400">THE 3AM PROBLEM</h2>
              <p className="text-primary font-mono mt-2">════════════════════════════════════════</p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-4 text-center">
              <p className="text-lg text-muted-foreground italic">"Did my partner already give paracetamol?"</p>
              <p className="text-lg text-muted-foreground italic">"When was the last temperature check?"</p>
              <p className="text-lg text-muted-foreground italic">"What did the doctor say the dose was again?"</p>
              <p className="text-lg text-muted-foreground italic">"Grandma is babysitting – does she know the schedule?"</p>
              
              <div className="pt-8">
                <p className="text-xl text-foreground">
                  When your child is unwell, <span className="text-destructive font-bold">uncertainty is the enemy</span>.
                </p>
                <p className="text-2xl text-primary font-bold mt-2">
                  LOG eliminates it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">EVERYTHING IN ONE PLACE</h2>
            <p className="text-muted-foreground">Simple tools for complete peace of mind</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Medications Card */}
            <div className="terminal-box p-6 border-amber-400/50 hover:border-amber-400 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Pill className="h-6 w-6 text-amber-400" />
                <span className="text-amber-400 font-bold">[Rx] MEDICATIONS</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Log every dose with timestamps. Set wait times between doses. 
                <span className="text-amber-400 font-semibold"> Never double-dose again.</span>
              </p>
            </div>

            {/* Health Metrics Card */}
            <div className="terminal-box p-6 border-cyan/50 hover:border-cyan transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-6 w-6 text-cyan" />
                <span className="text-cyan font-bold">[H] HEALTH METRICS</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Track temperature, pulse, oxygen levels, weight—anything you need.
                <span className="text-cyan font-semibold"> See trends over time.</span>
              </p>
            </div>

            {/* Notes Card */}
            <div className="terminal-box p-6 border-magenta/50 hover:border-magenta transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-6 w-6 text-magenta" />
                <span className="text-magenta font-bold">[N] NOTES</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Log symptoms, behaviours, observations. Build a complete picture for
                <span className="text-magenta font-semibold"> doctor visits.</span>
              </p>
            </div>

            {/* AI Review Card */}
            <div className="terminal-box p-6 border-primary/50 hover:border-primary transition-colors relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                  <span className="text-primary font-bold">[AI] SMART REVIEW</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  AI analyzes all logged data and provides
                  <span className="text-primary font-semibold"> severity assessments with guidance.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Coordination Section */}
        <section className="border-y border-primary/30 bg-muted/20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">EVERYONE ON THE SAME PAGE</h2>
              <p className="text-muted-foreground">Coordinate care with anyone who helps</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-primary rounded-none flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold mb-2">SHARE</h3>
                <p className="text-muted-foreground text-sm">
                  Invite partners, grandparents, babysitters. Everyone sees the same log.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-primary rounded-none flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold mb-2">NOTIFY</h3>
                <p className="text-muted-foreground text-sm">
                  Push notifications keep everyone informed of new logs and AI reviews.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-primary rounded-none flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold mb-2">SYNC</h3>
                <p className="text-muted-foreground text-sm">
                  Real-time updates. What you log appears instantly for everyone.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Health Review Highlight */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <div className="terminal-box border-primary p-8">
              <div className="text-primary font-mono mb-6">
                <p>╔═══════════════════════════════════════════════════════╗</p>
                <p className="py-2 text-center text-xl font-bold">&gt; AI HEALTH REVIEW</p>
                <p>╚═══════════════════════════════════════════════════════╝</p>
              </div>
              
              <div className="text-center mb-8">
                <p className="text-xl mb-4">Not sure if you should be worried?</p>
                <p className="text-muted-foreground">
                  Our AI reviews all logged data—medications, measurements, notes—and provides 
                  a severity assessment with actionable guidance.
                </p>
              </div>
              
              <div className="space-y-3 max-w-md mx-auto">
                <div className="flex items-center gap-3 p-2 border border-primary/20">
                  <span className="text-primary font-mono">●</span>
                  <span className="text-muted-foreground">Level 1/5</span>
                  <span className="text-primary ml-auto text-sm">Continue monitoring</span>
                </div>
                <div className="flex items-center gap-3 p-2 border border-amber-400/20">
                  <span className="text-amber-400 font-mono">●</span>
                  <span className="text-muted-foreground">Level 3/5</span>
                  <span className="text-amber-400 ml-auto text-sm">Consider medical advice</span>
                </div>
                <div className="flex items-center gap-3 p-2 border border-destructive/20">
                  <span className="text-destructive font-mono">●</span>
                  <span className="text-muted-foreground">Level 5/5</span>
                  <span className="text-destructive ml-auto text-sm">Seek immediate care</span>
                </div>
              </div>
              
              <p className="text-center text-muted-foreground text-xs mt-6">
                AI assessments are advisory only and do not replace professional medical advice.
              </p>
            </div>
          </div>
        </section>

        {/* Why Free Section */}
        <section className="border-y border-primary/30 bg-muted/20">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold">WHY IS THIS FREE?</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Because every parent deserves peace of mind—not another subscription. 
              LOG was built by parents, for parents. Your child's health data stays yours, 
              encrypted and private. No ads. No selling data. No hidden catches.
            </p>
            <p className="text-primary font-semibold">
              Just a tool that should exist.
            </p>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <p className="text-2xl md:text-3xl font-bold mb-2 max-w-2xl mx-auto">
            "The peace of mind no parent should be without."
          </p>
          
          <p className="text-muted-foreground mb-8">
            Set up in 60 seconds. Start logging immediately.
          </p>
          
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")} 
            className="text-lg px-10 py-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            START PROTECTING YOUR FAMILY
          </Button>
          
          <p className="text-muted-foreground text-sm mt-6">
            Free forever. Your data stays yours. Always.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
            Made with <Heart className="h-4 w-4 text-destructive inline" /> for parents everywhere
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
