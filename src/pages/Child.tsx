import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings2 } from "lucide-react";
import { ActivityLog } from "@/components/ActivityLog";
import { ChildSettingsSheet } from "@/components/ChildSettingsSheet";
import { QuickLogFAB } from "@/components/QuickLogFAB";
import { toast } from "@/hooks/use-toast";

interface ChildData {
  id: string;
  name: string;
  initials: string;
  color: string;
  created_by: string;
}

const Child = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (id) {
      fetchChild();
      updateFavicon();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('medication-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medication_logs',
        },
        async (payload) => {
          const newLog = payload.new;
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || newLog.given_by === user.id) return;

          const { data: medication } = await supabase
            .from('medications')
            .select('name, child_id')
            .eq('id', newLog.medication_id)
            .single();

          if (medication?.child_id === id) {
            const { data: giver } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newLog.given_by)
              .single();

            toast({
              title: "Medication Logged",
              description: `${giver?.full_name || 'A caregiver'} gave ${medication.name}`,
            });

            setRefreshTrigger(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchChild = async () => {
    try {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setChild(data);
      updateFavicon(data);
    } catch (error: any) {
      console.error("Error loading child:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateFavicon = (childData?: ChildData) => {
    if (!childData) return;

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = childData.color;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(childData.initials, 32, 32);

    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (link) {
      link.href = canvas.toDataURL();
    }

    document.title = `${childData.name} - KidCare`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!child) return null;

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="border-b sticky top-0 backdrop-blur-xl bg-background/80 z-10" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-lg"
                style={{ backgroundColor: child.color }}
              >
                {child.initials}
              </div>
              <h1 className="text-xl font-bold truncate">{child.name}</h1>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="rounded-full">
              <Settings2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 min-h-[calc(100dvh-4rem)]">
        <ActivityLog childId={id!} child={child} onActivityUpdate={fetchChild} refreshTrigger={refreshTrigger} />
      </main>

      <QuickLogFAB childId={id!} onLogComplete={() => setRefreshTrigger(prev => prev + 1)} />

      <ChildSettingsSheet 
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        childId={id!}
        child={child}
        onUpdate={fetchChild}
      />
    </div>
  );
};

export default Child;