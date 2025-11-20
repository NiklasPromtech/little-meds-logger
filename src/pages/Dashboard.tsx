import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Plus, LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">KidCare</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Children</h2>
            <p className="text-muted-foreground">
              Track medications and measurements for each child
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Child
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : children.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No children yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first child to start tracking their care
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Child
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card
                key={child.id}
                className="group relative p-8 cursor-pointer bg-gradient-to-br from-card to-card/50 border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 overflow-hidden"
                onClick={() => navigate(`/child/${child.id}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-6 shadow-lg ring-4 ring-background/50 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: child.color }}
                  >
                    {child.initials}
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{child.name}</h3>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateChildDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onChildCreated={fetchChildren}
      />
    </div>
  );
};

export default Dashboard;