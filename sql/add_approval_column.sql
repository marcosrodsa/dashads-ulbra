-- Add 'approved' column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Update existing users to be approved by default (so we don't lock out current admins/users)
UPDATE public.profiles 
SET approved = true 
WHERE created_at < now();

-- Ensure RLS allows admins to update this column
-- (Existing policies might already cover 'UPDATE profiles' for admins, but let's be safe if needed)
-- Usually profiles policies are "Users can update own profile".
-- We need a policy for Admins to update ANY profile.

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
