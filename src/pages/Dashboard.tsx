import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LogOut } from "lucide-react";
import { CreateChildDialog } from "@/components/CreateChildDialog";

interface Child {
  id: string;
  name: string;
  initials: string;
  color: string;
  created_at: string;
}

const Dashboard = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchChildren();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChildren(data || []);
    } catch (error: any) {
      console.error("Error loading children:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="container mx-auto px-4 py-4">
          {/* Mobile header */}
          <div className="sm:hidden">
            <div className="border border-primary p-2 mb-2">
              <p className="text-primary text-xs text-center">KIDCARE MEDICAL TERMINAL v1.0</p>
              <p className="text-primary text-xs text-center">PATIENT MONITORING SYSTEM</p>
            </div>
          </div>
          
          {/* Desktop header */}
          <pre className="hidden sm:block text-primary text-xs sm:text-sm leading-tight mb-2">
{`╔════════════════════════════════════════════════╗
║  KIDCARE MEDICAL TERMINAL v1.0                 ║
║  PATIENT MONITORING SYSTEM                     ║
╚════════════════════════════════════════════════╝`}
          </pre>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-muted-foreground text-xs sm:text-sm">SYSTEM READY</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs px-2">
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              [LOGOUT]
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 min-h-[calc(100dvh-10rem)]">
        <div className="mb-6">
          <h2 className="text-2xl uppercase tracking-wider mb-1">
            &gt; PATIENT DATABASE
          </h2>
          <p className="text-muted-foreground">
            SELECT PATIENT TO VIEW MEDICAL RECORDS
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-primary">LOADING DATA<span className="animate-blink">█</span></p>
          </div>
        ) : children.length === 0 ? (
          <Card className="p-8 text-center">
            <pre className="text-muted-foreground text-sm mb-4">
{`╔══════════════════════════════════╗
║  NO PATIENTS ON FILE             ║
║                                  ║
║  PRESS [N] TO ADD NEW PATIENT    ║
╚══════════════════════════════════╝`}
            </pre>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              [N] NEW PATIENT
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {children.map((child, index) => (
              <Card
                key={child.id}
                className="group cursor-pointer hover:border-primary transition-all duration-200"
                onClick={() => navigate(`/child/${child.id}`)}
              >
                <div className="flex items-center gap-4 p-4">
                  <span className="text-muted-foreground">[{index + 1}]</span>
                  <div
                    className="w-10 h-10 border-2 border-current flex items-center justify-center text-sm font-normal"
                    style={{ borderColor: child.color, color: child.color }}
                  >
                    {child.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg uppercase tracking-wider">{child.name}</p>
                    <p className="text-sm text-muted-foreground">
                      PATIENT ID: {child.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span className="text-muted-foreground group-hover:text-primary transition-colors">
                    &gt;&gt;
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ bottom: 'calc(1.5rem + var(--safe-area-inset-bottom))' }}>
        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="shadow-[0_0_15px_hsl(120_100%_50%/0.3)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          [N] ADD PATIENT
        </Button>
      </div>

      <CreateChildDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onChildCreated={fetchChildren}
      />
    </div>
  );
};

export default Dashboard;