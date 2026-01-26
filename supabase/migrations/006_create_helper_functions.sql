-- Create helper functions for RLS policies
-- Run this if you get errors about missing functions

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = is_team_member.user_id AND team_id = is_team_member.team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role in team
CREATE OR REPLACE FUNCTION public.get_team_role(user_id UUID, team_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.team_memberships
    WHERE user_id = get_team_role.user_id AND team_id = get_team_role.team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

