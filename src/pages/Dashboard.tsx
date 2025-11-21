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
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">KidCare</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 min-h-[calc(100dvh-5rem)]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Children</h2>
            <p className="text-muted-foreground">
              Track medications and measurements for each child
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : children.length === 0 ? (
          <Card className="p-12 text-center backdrop-blur-xl bg-card/80">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No children yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first child to start tracking their care
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Child
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card
                key={child.id}
                className="group relative p-8 cursor-pointer backdrop-blur-xl bg-card/80 border hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 overflow-hidden"
                onClick={() => navigate(`/child/${child.id}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-secondary/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-6 shadow-xl ring-2 ring-background/20 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: child.color }}
                  >
                    {child.initials}
                  </div>
                  <h3 className="text-2xl font-bold">{child.name}</h3>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button
          size="lg"
          className="h-14 px-8 rounded-full shadow-2xl shadow-primary/20 hover:shadow-3xl hover:shadow-primary/30 transition-all duration-200 hover:scale-105 active:scale-95 backdrop-blur-xl"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Child
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