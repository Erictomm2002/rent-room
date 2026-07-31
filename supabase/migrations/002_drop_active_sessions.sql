-- Drop active_sessions table and its RLS policy
drop policy if exists "Users can manage their own active sessions" on active_sessions;
drop table if exists active_sessions;
