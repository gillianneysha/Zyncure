import React, { useEffect, useState } from "react";
import AppRouter from './AppRouter'; // or the main app component
import SplashScreen from "./components/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000); // 2 seconds
    return () => clearTimeout(timer);
  }, []);

  return showSplash ? <SplashScreen /> : <AppRouter />;
}

