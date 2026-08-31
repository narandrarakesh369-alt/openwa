-- Migration: Switch WhatsApp integration from Twilio/Meta to self-hosted OpenWA
-- Adds server_url and session_id columns to whatsapp_settings
-- Adds wa_message_id to whatsapp_logs for message tracking

-- Add OpenWA-specific columns to whatsapp_settings
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS server_url TEXT DEFAULT 'http://localhost:2785',
  ADD COLUMN IF NOT EXISTS session_id TEXT DEFAULT 'default';

-- Update existing rows to use OpenWA provider
UPDATE public.whatsapp_settings
  SET api_provider = 'OpenWA'
  WHERE api_provider IN ('Twilio', 'Meta');

-- Add WhatsApp message ID column to logs for tracking delivery
ALTER TABLE public.whatsapp_logs
  ADD COLUMN IF NOT EXISTS wa_message_id TEXT;
