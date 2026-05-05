import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProctor, ViolationKind } from "@/hooks/useProctor";
import { QUESTIONS } from "@/data/questions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Camera, Mic, ShieldCheck, Timer } from "lucide-react";

const EXAM_MIN = 30;
const MAX_VIOLATIONS = 3;

export default function Exam() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [idx, setIdx] = useState(0);
  const [violations, setViolations] = useState<{ kind: ViolationKind; details?: string; at: number }[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(EXAM_MIN * 60);
  const [started, setStarted] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const handleViolation = async (kind: ViolationKind, details?: string) => {
    setViolations((v) => {
      const next = [...v, { kind, details, at: Date.now() }];
      const labels: Record<ViolationKind, string> = {
        multiple_faces: "Multiple faces detected",
        microphone: "Microphone activity detected",
        tab_switch: "Tab switch / window blur",
      };
      const remaining = MAX_VIOLATIONS - next.length;
      if (remaining > 0) toast.warning(`${labels[kind]} — ${remaining} warning${remaining > 1 ? "s" : ""} left`);
      else toast.error("Maximum violations reached. Submitting your exam.");
      return next;
    });
    if (attemptId && user) {
      await supabase.from("violations").insert({
        attempt_id: attemptId,
        user_id: user.id,
        v_type: kind,
        details: details ?? null,
      });
    }
  };

  const proctor = useProctor({ active: started, onViolation: handleViolation });

  // Allow the student to enable camera on the pre-flight screen so they
  // can verify it's working BEFORE the exam timer starts.
  const enableCamera = async () => {
    const res = await proctor.start();
    if (!res.ok) toast.error(res.error || "Could not enable camera/microphone");
    else toast.success("Camera & microphone enabled");
  };

  // Start attempt — requires camera ready first
  const beginExam = async () => {
    if (!user) return;
    if (!proctor.ready) {
      const res = await proctor.start();
      if (!res.ok) {
        toast.error(res.error || "Camera & microphone access is required to start.");
        return;
      }
    }
    const { data, error } = await supabase
      .from("exam_attempts")
      .insert({ user_id: user.id, total: QUESTIONS.length })
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message || "Could not start exam");
      return;
    }
    setAttemptId(data.id);
    setStarted(true);
    // request fullscreen for stricter proctoring
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  // Timer
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [started]);

  const submit = async (terminated = false) => {
    if (!attemptId || !user || submittingRef.current) return;
    submittingRef.current = true;
    let score = 0;
    QUESTIONS.forEach((q) => {
      if (answers[q.id] === q.answer) score++;
    });
    await supabase
      .from("exam_attempts")
      .update({
        score,
        answers: answers as any,
        status: terminated ? "terminated" : "submitted",
        finished_at: new Date().toISOString(),
      })
      .eq("id", attemptId);
    proctor.stop();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    navigate(`/result/${attemptId}`);
  };

  // Auto-submit on time / max violations
  useEffect(() => {
    if (!started) return;
    if (secondsLeft <= 0) submit(false);
  }, [secondsLeft, started]);
  useEffect(() => {
    if (started && violations.length >= MAX_VIOLATIONS) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violations, started]);

  const q = QUESTIONS[idx];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const mm = String(Math.floor(Math.max(secondsLeft, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(secondsLeft, 0) % 60).padStart(2, "0");

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-3xl w-full p-8 shadow-elegant border-0 animate-fade-in grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-6 w-6" />
              <span className="font-semibold">Pre-flight check</span>
            </div>
            <h1 className="text-3xl font-bold mt-2">Ready, {profile?.full_name?.split(" ")[0] || "Student"}?</h1>
            <p className="text-muted-foreground mt-2">
              Enable your camera & microphone, verify your face is clearly visible, then start the {EXAM_MIN}-minute Java exam. {MAX_VIOLATIONS} violations end the attempt.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex gap-2"><Camera className="h-4 w-4 text-accent" /> Camera & multi-face monitoring</li>
              <li className="flex gap-2"><Mic className="h-4 w-4 text-accent" /> Microphone activity monitoring</li>
              <li className="flex gap-2"><AlertTriangle className="h-4 w-4 text-accent" /> Tab/window switching is logged</li>
            </ul>
            {proctor.error && (
              <p className="mt-4 text-sm text-destructive">{proctor.error}</p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              {!proctor.ready ? (
                <Button onClick={enableCamera} size="lg" variant="outline" className="w-full">
                  <Camera className="h-4 w-4 mr-2" /> Enable camera & microphone
                </Button>
              ) : (
                <p className="text-sm text-success font-medium flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success inline-block" /> Camera & microphone ready
                </p>
              )}
              <Button
                onClick={beginExam}
                size="lg"
                disabled={!proctor.ready}
                className="w-full bg-gradient-primary shadow-elegant disabled:opacity-50"
              >
                I agree & start exam
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Camera preview</p>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video border">
              <video
                ref={proctor.videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {!proctor.ready && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-muted/40">
                  Click "Enable camera" to start preview
                </div>
              )}
              {proctor.ready && (
                <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-semibold text-primary-foreground bg-destructive/90 rounded px-1.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Make sure your face is well-lit and centered in frame.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur border-b">
        <div className="container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold">AI.Examify</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="secondary" className="gap-1"><Timer className="h-3.5 w-3.5" /> {mm}:{ss}</Badge>
            <Badge className={violations.length ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"}>
              Violations {violations.length}/{MAX_VIOLATIONS}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container py-6 grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Question card */}
        <Card className="p-6 shadow-card border-0 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">Question {idx + 1} / {QUESTIONS.length}</Badge>
            <Badge className={q.level === "basic" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
              {q.level.toUpperCase()}
            </Badge>
          </div>
          <Progress value={((idx + 1) / QUESTIONS.length) * 100} className="mb-6" />
          <h2 className="text-xl font-semibold leading-snug">{q.q}</h2>
          <div className="mt-5 space-y-2">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
                    selected
                      ? "border-primary bg-primary/10 shadow-card"
                      : "border-border hover:border-primary/40 hover:bg-muted"
                  }`}
                >
                  <span className="inline-flex items-center justify-center h-6 w-6 mr-3 rounded-full bg-muted text-xs font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">{answeredCount} answered</span>
            {idx < QUESTIONS.length - 1 ? (
              <Button onClick={() => setIdx((i) => i + 1)} className="bg-gradient-primary">Next</Button>
            ) : (
              <Button onClick={() => submit(false)} className="bg-gradient-primary">Submit Exam</Button>
            )}
          </div>
        </Card>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card className="p-4 border-0 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Live monitoring</p>
              <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse-ring" />
            </div>
            <div className="relative rounded-md overflow-hidden bg-black aspect-video">
              <video
                ref={proctor.videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <span className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[10px] font-semibold text-primary-foreground bg-destructive/90 rounded px-1.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Camera & mic active · face tracked every second</p>
          </Card>

          <Card className="p-4 border-0 shadow-card">
            <p className="text-sm font-medium mb-3">Question palette</p>
            <div className="grid grid-cols-5 gap-2">
              {QUESTIONS.map((qq, i) => {
                const a = answers[qq.id] !== undefined;
                const cur = i === idx;
                return (
                  <button
                    key={qq.id}
                    onClick={() => setIdx(i)}
                    className={`h-9 rounded-md text-sm font-medium border transition-all ${
                      cur
                        ? "bg-primary text-primary-foreground border-primary"
                        : a
                        ? "bg-success/15 text-success border-success/40"
                        : "bg-muted border-border hover:border-primary/40"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </Card>

          {violations.length > 0 && (
            <Card className="p-4 border-0 shadow-card">
              <p className="text-sm font-medium mb-2 text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Violations
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {violations.slice(-5).map((v, i) => (
                  <li key={i}>• {v.kind.replace("_", " ")}{v.details ? ` — ${v.details}` : ""}</li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </main>
    </div>
  );
}