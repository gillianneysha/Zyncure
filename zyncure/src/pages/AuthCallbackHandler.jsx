import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";

export default function AuthCallbackHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      // Check if profile exists in the DB
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile || !profile.first_name || !profile.last_name || !profile.contact_number || !profile.birthdate || !profile.user_type) {
        // Redirect to complete profile if missing
        navigate("/complete-profile", { replace: true });
      } else {
        // Redirect to dashboard/home
        navigate("/home", { replace: true });
      }
    };
    checkProfile();
  }, [navigate]);

  return <div>Signing you in with Google...</div>;
}