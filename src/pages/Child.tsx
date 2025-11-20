import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings } from "lucide-react";
import { ActivityLog } from "@/components/ActivityLog";
import { ManageItems } from "@/components/ManageItems";
import { QuickLogFAB } from "@/components/QuickLogFAB";

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
  const { toast } = useToast();
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchChild();
      updateFavicon();
    }
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
      toast({
        title: "Error loading child",
        description: error.message,
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: child.color }}
            >
              {child.initials}
            </div>
            <h1 className="text-3xl font-bold">{child.name}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="log" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="log">Activity Log</TabsTrigger>
            <TabsTrigger value="manage">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log">
            <ActivityLog childId={id!} child={child} />
          </TabsContent>

          <TabsContent value="manage">
            <ManageItems childId={id!} child={child} onUpdate={fetchChild} />
          </TabsContent>
        </Tabs>
      </main>

      <QuickLogFAB childId={id!} onLogComplete={fetchChild} />
    </div>
  );
};

export default Child;