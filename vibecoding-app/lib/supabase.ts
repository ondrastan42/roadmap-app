import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://jrocmktjzobcrxbgcwke.supabase.co/rest/v1/",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyb2Nta3Rqem9iY3J4Ymdjd2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTA4ODgsImV4cCI6MjA5MzM4Njg4OH0.kIcgCxBaRemw6v1mo1FSmEqSm6RXrKFZG7yn0-wDhgg"
);