import React, { useEffect, useState } from "react";

export default function SplashScreen() {
  const [logoVisible, setLogoVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLogoVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: `url('/zyncure_splash_screen_bg.png') center center / cover no-repeat`,
      }}
    >
      <img
        src="/zyncure_splash_screen_logo.png"
        alt="ZynCure Logo"
        className={`transition-opacity duration-1000 ${logoVisible ? "opacity-100" : "opacity-0"}`}
        style={{ width: "320px", maxWidth: "80vw", maxHeight: "60vh" }}
      />
    </div>
  );
}