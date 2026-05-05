import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Mic, MonitorSmartphone, ShieldCheck, Code2, Timer, LogOut } from "lucide-react";

const Index = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero */}
      <header className="bg-gradient-hero text-primary-foreground">
        <div className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7" />
            <span className="text-xl font-semibold">ProctorEx</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => signOut().then(() => navigate("/auth"))}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
        <div className="container pb-16 pt-6 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
            Online Java Examination with Live AI Proctoring
          </h1>
          <p className="mt-4 text-primary-foreground/85 max-w-2xl">
            20 MCQs · 30 minute timer · camera, microphone & tab monitoring. Three violations end your attempt.
          </p>
        </div>
      </header>

      <main className="container -mt-10 pb-16 space-y-8">
        {/* Student card */}
        <Card className="p-6 shadow-elegant border-0 bg-card animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <h2 className="text-2xl font-semibold">{profile?.full_name || "Student"}</h2>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span><strong className="text-foreground">Roll No:</strong> {profile?.roll_no || "—"}</span>
                <span><strong className="text-foreground">Branch:</strong> {profile?.branch || "—"}</span>
                <span><strong className="text-foreground">Email:</strong> {user.email}</span>
              </div>
            </div>
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 shadow-elegant" onClick={() => navigate("/exam")}>
              Start Exam
            </Button>
          </div>
        </Card>

        {/* Exam meta */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Code2, label: "Subject", val: "Java (Basic + Hard)" },
            { icon: Timer, label: "Duration", val: "30 minutes" },
            { icon: ShieldCheck, label: "Questions", val: "20 MCQs" },
            { icon: MonitorSmartphone, label: "Strikes", val: "3 violations max" },
          ].map((c) => (
            <Card key={c.label} className="p-5 shadow-card border-0">
              <c.icon className="h-6 w-6 text-primary" />
              <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className="text-lg font-semibold">{c.val}</p>
            </Card>
          ))}
        </div>

        {/* Rules */}
        <Card className="p-6 border-0 shadow-card">
          <h3 className="text-lg font-semibold mb-4">Proctoring rules</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Camera, t: "Camera always on", d: "Multiple faces in frame is logged as a violation." },
              { icon: Mic, t: "Microphone monitored", d: "Loud talking or background voices trigger a warning." },
              { icon: MonitorSmartphone, t: "Stay on this tab", d: "Switching tab/window or losing focus counts as a violation." },
            ].map((r) => (
              <div key={r.t} className="rounded-lg bg-muted/50 p-4">
                <r.icon className="h-5 w-5 text-accent" />
                <p className="font-medium mt-2">{r.t}</p>
                <p className="text-sm text-muted-foreground">{r.d}</p>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Index;
