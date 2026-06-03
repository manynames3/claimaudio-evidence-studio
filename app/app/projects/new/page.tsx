"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, UploadCloud } from "lucide-react";
import { ProcessingStepper } from "@/components/processing-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClaimAudioStore } from "@/lib/store/use-claim-audio-store";
import { buttonVariants } from "@/components/ui/button";
import { MAX_AUDIO_UPLOAD_BYTES } from "@/lib/client/backend-api";

const acceptedUploadExtensions = new Set(["mp3", "mp4", "m4a", "wav", "flac", "ogg", "webm", "amr"]);

export default function NewProjectPage() {
  const router = useRouter();
  const startMockProjectProcessing = useClaimAudioStore((state) => state.startMockProjectProcessing);
  const startUploadedProjectProcessing = useClaimAudioStore((state) => state.startUploadedProjectProcessing);
  const retryProcessing = useClaimAudioStore((state) => state.retryProcessing);
  const processingRuns = useClaimAudioStore((state) => state.processingRuns);
  const backendStatus = useClaimAudioStore((state) => state.backendStatus);
  const ensureBackendStatus = useClaimAudioStore((state) => state.ensureBackendStatus);
  const [claimNumber, setClaimNumber] = useState("AUTO-BI-");
  const [claimantName, setClaimantName] = useState("");
  const [insuredName, setInsuredName] = useState("");
  const [lossDate, setLossDate] = useState("2026-05-14");
  const [claimType, setClaimType] = useState("Auto bodily injury");
  const [lineOfBusiness, setLineOfBusiness] = useState("Personal Auto");
  const [processingProjectId, setProcessingProjectId] = useState<string>();
  const [isStarting, setIsStarting] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRun = processingProjectId ? processingRuns[processingProjectId] : undefined;
  const isCheckingUploadReadiness = !backendStatus;
  const realUploadUnavailable = Boolean(backendStatus?.neonConfigured && !backendStatus.awsConfigured);

  const projectInput = () => ({
      claimNumber: claimNumber.trim() === "AUTO-BI-" ? `AUTO-BI-${Math.floor(8000 + Math.random() * 900)}` : claimNumber,
      claimantName: claimantName || "Maria Santos",
      insuredName: insuredName || "Evan Brooks",
      lossDate,
      claimType,
      lineOfBusiness
  });

  const startProcessing = async (sourceType: "sample" | "uploaded") => {
    setIsStarting(true);
    setUploadError(undefined);
    const project = await startMockProjectProcessing(
      projectInput(),
      sourceType,
      sourceType === "sample" ? "Santos_recorded_statement_polly_demo.wav" : "fake_uploaded_recorded_statement.wav"
    );

    setProcessingProjectId(project.id);
    setIsStarting(false);
  };

  const startUploadedProcessing = async (file: File) => {
    setIsStarting(true);
    setUploadError(undefined);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      if (!acceptedUploadExtensions.has(extension)) {
        throw new Error("Use an audio file in mp3, mp4, m4a, wav, flac, ogg, webm, or amr format.");
      }

      if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
        throw new Error("Audio uploads are capped at 100 MB for the low-volume pilot.");
      }

      const project = await startUploadedProjectProcessing(projectInput(), file);

      setProcessingProjectId(project.id);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsStarting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    void ensureBackendStatus();
  }, [ensureBackendStatus]);

  useEffect(() => {
    if (processingProjectId && processingRun?.status === "readyForReview") {
      const timeout = window.setTimeout(() => {
        router.push(`/app/projects/${processingProjectId}/workspace`);
      }, 600);

      return () => window.clearTimeout(timeout);
    }
  }, [processingProjectId, processingRun?.status, router]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <Badge variant="info">New review file</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Create Claim Project</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Claim details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="claim-number">Claim number</Label>
              <Input id="claim-number" value={claimNumber} onChange={(event) => setClaimNumber(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loss-date">Date of loss</Label>
              <Input id="loss-date" type="date" value={lossDate} onChange={(event) => setLossDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claimant-name">Claimant name</Label>
              <Input
                id="claimant-name"
                placeholder="Maria Santos"
                value={claimantName}
                onChange={(event) => setClaimantName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insured-name">Insured name</Label>
              <Input
                id="insured-name"
                placeholder="Evan Brooks"
                value={insuredName}
                onChange={(event) => setInsuredName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Claim type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={claimType}
                onChange={(event) => setClaimType(event.target.value)}
              >
                <option value="Auto bodily injury">Auto bodily injury</option>
                <option value="Auto liability">Auto liability</option>
                <option value="UM/UIM bodily injury">UM/UIM bodily injury</option>
                <option value="Coverage investigation">Coverage investigation</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Line of business</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={lineOfBusiness}
                onChange={(event) => setLineOfBusiness(event.target.value)}
              >
                <option value="Personal Auto">Personal Auto</option>
                <option value="Commercial Auto">Commercial Auto</option>
                <option value="Excess Casualty">Excess Casualty</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recorded statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="outline"
                disabled={isStarting || Boolean(processingProjectId) || isCheckingUploadReadiness || realUploadUnavailable}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-4 w-4" />
                {isCheckingUploadReadiness ? "Checking upload readiness" : "Upload audio"}
              </Button>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="audio/*,.mp3,.mp4,.m4a,.wav,.flac,.ogg,.webm,.amr"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void startUploadedProcessing(file);
                  }
                }}
              />
              <Button
                className="w-full"
                disabled={isStarting || Boolean(processingProjectId)}
                onClick={() => void startProcessing("sample")}
              >
                <FlaskConical className="h-4 w-4" />
                Use sample statement
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                {realUploadUnavailable
                  ? "Real uploads need AWS S3 and Transcribe configuration. Sample statements remain available for this pilot."
                  : "Supported: mp3, m4a, wav, flac, ogg, webm, amr."}
              </p>
              {uploadError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
                  {uploadError}
                </p>
              )}
            </CardContent>
          </Card>

          {processingProjectId && (
            <ProcessingStepper
              processingRun={processingRun}
              onRetry={() => retryProcessing(processingProjectId)}
            />
          )}
          <Link href="/app" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
