-- Create a secure function to check if a user is an admin
-- SECURITY DEFINER allows this function to bypass RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to be safe (names might vary, so we try to catch standard ones)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
-- Also drop potentially conflicting ones if they exist with different names
DROP POLICY IF EXISTS "View own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin view all" ON public.profiles;

-- Re-create Policies

-- 1. Read Policy: Users can see themselves OR Admins can see everyone
CREATE POLICY "Profiles are viewable by users who created them or admins"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id -- User can see own
  OR
  public.is_admin() -- Admin can see all
);

-- 2. Update Policy: Admins can update everyone (e.g. approve/block)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (
  public.is_admin()
);

-- 3. Insert Policy: Users can insert their own profile (usually handled by trigger, but good to have)
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (
  auth.uid() = id
);
