import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Home, ShieldAlert } from "lucide-react";
import { QUESTIONS } from "@/data/questions";

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [attempt, setAttempt] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("exam_attempts").select("*").eq("id", id).maybeSingle();
      setAttempt(data);
      const { data: vs } = await supabase.from("violations").select("*").eq("attempt_id", id).order("created_at");
      setViolations(vs || []);
    })();
  }, [id]);

  if (!attempt) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-subtle text-muted-foreground">Loading result…</div>;
  }

  const pct = Math.round((attempt.score / attempt.total) * 100);
  const passed = pct >= 50 && attempt.status !== "terminated";
  const answers = (attempt.answers || {}) as Record<string, number>;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-gradient-hero text-primary-foreground py-10">
        <div className="container">
          <p className="opacity-80">Exam result</p>
          <h1 className="text-4xl font-bold mt-1">
            {attempt.status === "terminated" ? "Attempt Terminated" : passed ? "Passed 🎉" : "Completed"}
          </h1>
          <p className="opacity-80 mt-1">
            Score: <strong>{attempt.score}/{attempt.total}</strong> ({pct}%)
          </p>
        </div>
      </header>

      <main className="container -mt-8 pb-16 space-y-6">
        <Card className="p-6 shadow-elegant border-0 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <Badge variant="secondary">Status: {attempt.status}</Badge>
            <Badge className={passed ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
              {pct}%
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> {violations.length} violation{violations.length !== 1 && "s"}
            </Badge>
          </div>
          <Button onClick={() => navigate("/")} className="bg-gradient-primary">
            <Home className="h-4 w-4 mr-2" /> Back to dashboard
          </Button>
        </Card>

        <Card className="p-6 border-0 shadow-card">
          <h3 className="font-semibold mb-4">Answer review</h3>
          <div className="space-y-3">
            {QUESTIONS.map((q, i) => {
              const picked = answers[q.id];
              const correct = picked === q.answer;
              return (
                <div key={q.id} className="rounded-lg border p-4">
                  <div className="flex items-start gap-2">
                    {correct ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{i + 1}. {q.q}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your answer: <span className="font-medium text-foreground">{picked !== undefined ? q.options[picked] : "—"}</span>
                      </p>
                      {!correct && (
                        <p className="text-sm text-success mt-0.5">Correct: {q.options[q.answer]}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    </div>
  );
}