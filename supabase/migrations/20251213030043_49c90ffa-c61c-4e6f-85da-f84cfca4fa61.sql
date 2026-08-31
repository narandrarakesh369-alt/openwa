-- Enable realtime for notification_logs table
ALTER TABLE public.notification_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;