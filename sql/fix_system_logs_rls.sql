-- Enable RLS on the table
ALTER TABLE "public"."sys_integration_logs" ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read logs
CREATE POLICY "Enable read access for authenticated users" ON "public"."sys_integration_logs"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- Policy to allow service_role to insert/update (usually enabled by default bypass, but good to be explicit if needed)
-- For now, read access is the priority for the dashboard.
