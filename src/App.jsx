// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import Layout from "./components/Layout";
import Login from "./components/Login";
import Register from "./components/Register";
import ProfilePage from "./pages/Profile";
import ExploreServices from "./pages/ExploreServices";

import Chat from "./pages/Chat.jsx";

import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import RequestNew from "./pages/RequestNew";
import RequestEdit from "./pages/RequestEdit";
import Services from "./pages/Services";
import ServiceNew from "./pages/ServiceNew";
import ServiceDetail from "./pages/ServiceDetail";
import Verify from "./pages/Verify";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";


import { isAuthed, logout, readProfile, hasOnboardingDone } from "./api";
import { RequireClient } from "./components/RequireRole";

/* --------- Guards --------- */
function RequireAuth({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}
function PublicOnly({ children }) {
  return isAuthed() ? <Navigate to="/home" replace /> : children;
}
function RequireOnboarding({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return hasOnboardingDone() ? children : <Navigate to="/onboarding" replace />;
}
function RequireProvider({ children }) {
  const p = readProfile?.();
  return p?.role === "provider" ? children : <Navigate to="/onboarding" replace />;
}


/* --------- App (EXPORT DEFAULT) --------- */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [authed, setAuthed] = useState(isAuthed());
  const [profile, setProfile] = useState(readProfile());

  useEffect(() => {
    setAuthed(isAuthed());
    setProfile(readProfile());
  }, [location.pathname]);

  function handleLogout() {
    logout();
    setAuthed(false);
    setProfile(null);
    navigate("/", { replace: true });
  }

  return (
    <Layout authed={authed} onLogout={handleLogout}>
      <Routes>
        {/* PÃºblica */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login onSuccess={() => { setAuthed(true); setProfile(readProfile()); }} />
            </PublicOnly>
          }
        />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/verify" element={<PublicOnly><Verify /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              {hasOnboardingDone()
                ? <Navigate to="/home" replace />
                : <Onboarding onFinish={() => setProfile(readProfile())} />}
            </RequireAuth>
          }
        />

        {/* App autenticada */}
        <Route path="/home" element={<RequireOnboarding><Home /></RequireOnboarding>} />
        <Route path="/profile" element={<RequireOnboarding><ProfilePage /></RequireOnboarding>} />

        {/* Requests */}
        <Route path="/requests" element={<RequireOnboarding><Requests /></RequireOnboarding>} />
        <Route
          path="/requests/new"
          element={
            <RequireOnboarding>
              <RequireClient><RequestNew /></RequireClient>
            </RequireOnboarding>
          }
        />
        <Route
  path="/services"
  element={
    <RequireOnboarding>
      <RequireProvider><Services /></RequireProvider>
    </RequireOnboarding>
  }
/>
<Route
  path="/services/explore"
  element={
    <RequireOnboarding>
      <ExploreServices />
    </RequireOnboarding>
  }
/>
<Route
  path="/services/new"
  element={
    <RequireOnboarding>
      <RequireProvider><ServiceNew /></RequireProvider>
    </RequireOnboarding>
  }
/>
<Route
  path="/service/:id"
  element={
    <RequireOnboarding>
      <ServiceDetail />
    </RequireOnboarding>
  }
/>
<Route
  path="/chat/:requestId"
  element={
    <RequireOnboarding>
      <Chat />
    </RequireOnboarding>
  }
/>
        <Route path="/requests/:id" element={<RequireOnboarding><RequestDetail /></RequireOnboarding>} />
        <Route
          path="/requests/:id/edit"
          element={
            <RequireOnboarding>
              <RequireClient><RequestEdit /></RequireClient>
            </RequireOnboarding>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
