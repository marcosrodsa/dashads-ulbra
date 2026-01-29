-- Insert profiles for users that exist in auth.users but not in public.profiles
INSERT INTO public.profiles (id, full_name, email, role, approved)
SELECT 
    u.id, 
    COALESCE(u.raw_user_meta_data->>'full_name', 'Usuário Sem Nome'), -- Fallback name
    u.email,
    'viewer', -- Default role
    FALSE -- Default to NOT approved so admin has to approve them
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles);

-- Also update any profiles that might still have null email (just in case)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;
