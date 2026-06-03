-- Adds first-class contradiction review audit events and target typing.

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
      'contradictionApproved',
      'contradictionRejected',
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

alter table audit_log_events
  drop constraint if exists audit_log_events_target_type_check;

alter table audit_log_events
  add constraint audit_log_events_target_type_check
  check (
    target_type in (
      'project',
      'audio',
      'transcript',
      'analysis',
      'finding',
      'contradiction',
      'clip',
      'export'
    )
  );
