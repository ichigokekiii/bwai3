import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import BarkadaCirclePage from "./pages/BarkadaCirclePage";
import AnalyzeAnnouncementPage from "./pages/AnalyzeAnnouncementPage";
import AlertRoomPage from "./pages/AlertRoomPage";
import { getUser } from "./services/api";

function AppShell() {
  const [user, setUser] = useState(null);
  const [userState, setUserState] = useState("loading");
  const demoUserId = Number(import.meta.env.VITE_DEMO_USER_ID || 1);

  function handleUserUpdated(data) {
    setUser(data);
    setUserState(data ? "ready" : "empty");
  }

  useEffect(() => {
    getUser(demoUserId)
      .then((data) => {
        handleUserUpdated(data);
      })
      .catch((error) => {
        if (error?.response?.status !== 404) {
          console.error(error);
        }
        handleUserUpdated(null);
      });
  }, [demoUserId]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage user={user} userState={userState} />} />
        <Route
          path="/setup"
          element={<ProfileSetupPage user={user} onUserUpdated={handleUserUpdated} />}
        />
        <Route path="/profile" element={<ProfileSetupPage user={user} onUserUpdated={handleUserUpdated} />} />
        <Route path="/barkada" element={<BarkadaCirclePage user={user} />} />
        <Route path="/panic-check" element={<AnalyzeAnnouncementPage user={user} />} />
        <Route path="/analyze" element={<AnalyzeAnnouncementPage user={user} />} />
        <Route path="/alerts/:alertId" element={<AlertRoomPage user={user} />} />
        <Route path="/dashboard" element={<LandingPage user={user} userState={userState} />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </BrowserRouter>
  );
}
