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
    
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile || !profile.first_name || !profile.last_name || !profile.contact_number || !profile.birthdate || !profile.user_type) {
    
        navigate("/complete-profile", { replace: true });
      } else {
        
        navigate("/home", { replace: true });
      }
    };
    checkProfile();
  }, [navigate]);

  return <div>Signing you in with Google...</div>;
}