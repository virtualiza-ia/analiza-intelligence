alter table public.manual_monthly_submissions enable row level security;
alter table public.manual_monthly_submission_versions enable row level security;
alter table public.manual_monthly_submission_events enable row level security;

revoke all on public.manual_monthly_submissions from anon;
revoke all on public.manual_monthly_submission_versions from anon;
revoke all on public.manual_monthly_submission_events from anon;

revoke insert, update, delete on public.manual_monthly_submissions from authenticated;
revoke insert, update, delete on public.manual_monthly_submission_versions from authenticated;
revoke insert, update, delete on public.manual_monthly_submission_events from authenticated;

create policy "read assigned manual submissions"
on public.manual_monthly_submissions
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "read assigned manual submission versions"
on public.manual_monthly_submission_versions
for select to authenticated
using (
  exists (
    select 1
    from public.manual_monthly_submissions submission
    where submission.id = submission_id
      and public.current_user_can_access_branch(submission.branch_id)
  )
);

create policy "read assigned manual submission events"
on public.manual_monthly_submission_events
for select to authenticated
using (
  exists (
    select 1
    from public.manual_monthly_submissions submission
    where submission.id = submission_id
      and public.current_user_can_access_branch(submission.branch_id)
  )
);

comment on policy "read assigned manual submissions"
on public.manual_monthly_submissions is
  'Authenticated clients can only read closures for branches in their assigned scope. Writes remain server-only.';
