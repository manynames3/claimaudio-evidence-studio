-- ClaimAudio Evidence Studio
-- Pilot hardening migration for auth-aware audit and supervisor review workflows.

alter table audit_log_events
  drop constraint if exists audit_log_events_event_type_check;

alter table audit_log_events
  add constraint audit_log_events_event_type_check
  check (
    event_type in (
      'projectCreated',
      'audioUploaded',
      'transcriptionStarted',
      'transcriptionCompleted',
      'analysisStarted',
      'analysisCompleted',
      'findingApproved',
      'findingRejected',
      'findingEdited',
      'clipCreated',
      'exportGenerated',
      'exportDownloaded',
      'projectSubmittedForSupervisorReview',
      'supervisorReviewApproved',
      'supervisorReviewReturned',
      'retentionPolicyUpdated',
      'securitySettingUpdated'
    )
  );

alter table user_review_actions
  drop constraint if exists user_review_actions_action_check;

alter table user_review_actions
  drop constraint if exists user_review_actions_target_type_check;

alter table user_review_actions
  add constraint user_review_actions_target_type_check
  check (
    target_type in (
      'project',
      'finding',
      'contradiction',
      'clip',
      'transcript',
      'export'
    )
  );

alter table user_review_actions
  add constraint user_review_actions_action_check
  check (
    action in (
      'approved',
      'rejected',
      'edited',
      'noted',
      'clipCreated',
      'exported',
      'submittedForSupervisorReview',
      'supervisorApproved',
      'supervisorReturned'
    )
  );

alter table app_users
  add column if not exists last_login_at timestamptz;

create index if not exists app_users_tenant_external_subject_idx
  on app_users (tenant_id, external_auth_subject);
