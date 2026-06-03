-- ClaimAudio Evidence Studio
-- Neon Postgres initial schema for paid-pilot readiness.
-- Apply this in a Neon free-tier project, then set DATABASE_URL.

create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data_region text not null default 'us-east-1',
  retention_days integer not null default 365,
  no_model_training boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('adjuster', 'supervisor', 'siu', 'defense_paralegal', 'defense_attorney', 'admin')),
  external_auth_subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table if not exists claim_projects (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  claim_number text not null,
  claimant_name text not null,
  insured_name text not null,
  loss_date date not null,
  claim_type text not null,
  line_of_business text not null,
  status text not null check (status in ('uploaded', 'transcribing', 'analyzing', 'ready', 'reviewing', 'needsSupervisorReview', 'draft', 'failed')),
  audio_asset_id text,
  review_flags jsonb not null default '{"readyForReview":false,"needsSupervisorReview":false,"siuFlagged":false,"draftMemoReady":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, claim_number)
);

create table if not exists audio_assets (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  claim_project_id text not null references claim_projects(id) on delete cascade,
  file_name text not null,
  duration_seconds integer not null,
  source_type text not null check (source_type in ('uploaded', 'sample')),
  processing_status text not null check (processing_status in ('uploaded', 'transcribing', 'analyzing', 'readyForReview', 'failed')),
  storage_url text,
  s3_bucket text,
  s3_key text,
  s3_version_id text,
  content_type text,
  checksum_sha256 text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'claim_projects_audio_asset_fk'
  ) then
    alter table claim_projects
      add constraint claim_projects_audio_asset_fk
      foreign key (audio_asset_id) references audio_assets(id)
      deferrable initially deferred;
  end if;
end $$;

create table if not exists processing_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  claim_project_id text not null references claim_projects(id) on delete cascade,
  audio_asset_id text not null references audio_assets(id) on delete cascade,
  job_type text not null check (job_type in ('transcription', 'analysis', 'export', 'clip')),
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'retrying')),
  provider text not null default 'mock',
  external_job_id text,
  message text not null,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transcript_segments (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  audio_asset_id text not null references audio_assets(id) on delete cascade,
  speaker text not null check (speaker in ('Adjuster', 'Claimant', 'Insured', 'Witness')),
  text text not null,
  start_time_seconds numeric(10, 3) not null,
  end_time_seconds numeric(10, 3) not null,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  check (end_time_seconds >= start_time_seconds)
);

create table if not exists evidence_findings (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  audio_asset_id text not null references audio_assets(id) on delete cascade,
  category text not null check (category in ('Liability', 'Injury', 'Damages', 'Prior Condition', 'Timeline', 'Coverage', 'Credibility', 'SIU Flag', 'Follow-up')),
  title text not null,
  speaker text not null,
  exact_quote text not null,
  start_time_seconds numeric(10, 3) not null,
  end_time_seconds numeric(10, 3) not null,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  severity text not null check (severity in ('low', 'medium', 'high')),
  why_it_matters text not null,
  recommended_follow_up text not null,
  related_transcript_segment_ids text[] not null default '{}',
  review_status text not null check (review_status in ('pending', 'approved', 'rejected', 'edited')),
  notes text not null default '',
  model_provider text not null default 'mock',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (exact_quote <> ''),
  check (why_it_matters <> ''),
  check (end_time_seconds >= start_time_seconds)
);

create table if not exists contradictions (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  audio_asset_id text not null references audio_assets(id) on delete cascade,
  title text not null,
  statement_a text not null,
  statement_b text not null,
  quote_a text not null,
  quote_b text not null,
  timestamp_a numeric(10, 3) not null,
  timestamp_b numeric(10, 3) not null,
  why_it_matters text not null,
  review_status text not null check (review_status in ('pending', 'approved', 'rejected', 'edited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quote_a <> ''),
  check (quote_b <> ''),
  check (why_it_matters <> '')
);

create table if not exists evidence_clips (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  audio_asset_id text not null references audio_assets(id) on delete cascade,
  claim_project_id text not null references claim_projects(id) on delete cascade,
  title text not null,
  start_time_seconds numeric(10, 3) not null,
  end_time_seconds numeric(10, 3) not null,
  transcript_excerpt text not null,
  linked_finding_ids text[] not null default '{}',
  created_by text not null,
  s3_clip_key text,
  created_at timestamptz not null default now(),
  check (end_time_seconds > start_time_seconds)
);

create table if not exists export_memos (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  claim_project_id text not null references claim_projects(id) on delete cascade,
  audio_asset_id text not null references audio_assets(id) on delete cascade,
  export_type text not null check (export_type in ('statementSummary', 'timestampedEvidenceMemo', 'contradictionReport', 'transcript', 'supervisorReviewPacket')),
  title text not null,
  content text not null,
  included_finding_ids text[] not null default '{}',
  included_contradiction_ids text[] not null default '{}',
  included_clip_ids text[] not null default '{}',
  s3_export_key text,
  created_at timestamptz not null default now()
);

create table if not exists user_review_actions (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  claim_project_id text not null references claim_projects(id) on delete cascade,
  audio_asset_id text not null references audio_assets(id) on delete cascade,
  target_type text not null check (target_type in ('project', 'finding', 'contradiction', 'clip', 'transcript', 'export')),
  target_id text not null,
  action text not null check (action in ('approved', 'rejected', 'edited', 'noted', 'clipCreated', 'exported')),
  previous_value jsonb,
  new_value jsonb,
  user_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_log_events (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  claim_project_id text references claim_projects(id) on delete cascade,
  audio_asset_id text references audio_assets(id) on delete cascade,
  event_type text not null check (event_type in ('projectCreated', 'audioUploaded', 'transcriptionStarted', 'transcriptionCompleted', 'analysisStarted', 'analysisCompleted', 'findingApproved', 'findingRejected', 'findingEdited', 'clipCreated', 'exportGenerated', 'exportDownloaded', 'projectSubmittedForSupervisorReview', 'supervisorReviewApproved', 'supervisorReviewReturned', 'retentionPolicyUpdated', 'securitySettingUpdated')),
  actor text not null,
  target_type text not null check (target_type in ('project', 'audio', 'transcript', 'analysis', 'finding', 'clip', 'export')),
  target_id text not null,
  summary text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists claim_projects_tenant_status_idx on claim_projects (tenant_id, status);
create index if not exists claim_projects_tenant_claim_number_idx on claim_projects (tenant_id, claim_number);
create index if not exists audio_assets_project_idx on audio_assets (claim_project_id);
create index if not exists processing_jobs_project_status_idx on processing_jobs (claim_project_id, status);
create index if not exists transcript_segments_audio_time_idx on transcript_segments (audio_asset_id, start_time_seconds);
create index if not exists evidence_findings_audio_status_idx on evidence_findings (audio_asset_id, review_status);
create index if not exists evidence_findings_audio_category_idx on evidence_findings (audio_asset_id, category);
create index if not exists contradictions_audio_status_idx on contradictions (audio_asset_id, review_status);
create index if not exists clips_project_idx on evidence_clips (claim_project_id, created_at desc);
create index if not exists export_memos_project_idx on export_memos (claim_project_id, created_at desc);
create index if not exists audit_log_tenant_created_idx on audit_log_events (tenant_id, created_at desc);
create index if not exists audit_log_project_created_idx on audit_log_events (claim_project_id, created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tenants_set_updated_at on tenants;
create trigger tenants_set_updated_at
before update on tenants
for each row execute function set_updated_at();

drop trigger if exists app_users_set_updated_at on app_users;
create trigger app_users_set_updated_at
before update on app_users
for each row execute function set_updated_at();

drop trigger if exists claim_projects_set_updated_at on claim_projects;
create trigger claim_projects_set_updated_at
before update on claim_projects
for each row execute function set_updated_at();

drop trigger if exists evidence_findings_set_updated_at on evidence_findings;
create trigger evidence_findings_set_updated_at
before update on evidence_findings
for each row execute function set_updated_at();

drop trigger if exists contradictions_set_updated_at on contradictions;
create trigger contradictions_set_updated_at
before update on contradictions
for each row execute function set_updated_at();

drop trigger if exists processing_jobs_set_updated_at on processing_jobs;
create trigger processing_jobs_set_updated_at
before update on processing_jobs
for each row execute function set_updated_at();
