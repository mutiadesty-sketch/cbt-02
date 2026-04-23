import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./pages/Login";
import StudentDash from "./pages/StudentDash";
import AdminDash from "./pages/admin/AdminDash";
import ExamRoom from "./pages/ExamRoom";
import ResultsView from "./pages/ResultsView";
import BootLoader from "./components/BootLoader";
import OfflineBanner from "./ui/OfflineBanner";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

import { isAllowedAdmin } from "./lib/auth";

// Result wrapper to extract ID from params
const ResultWrapper = () => {
  const { id } = useParams();
  return (
    <>
      <OfflineBanner />
      <ResultsView resultId={id} />
    </>
  );
};

// Protected route component
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, role } = useAuthStore();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
};

function AnimatedRoutes() {
  const { user, role, setUser, setRole } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [minLoadingDone, setMinLoadingDone] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingDone(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isAllowed = await isAllowedAdmin(firebaseUser.email);
        if (isAllowed) {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            setUser({
              name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
              email: firebaseUser.email,
              id: "admin",
              photoURL: firebaseUser.photoURL || null,
            });
            setRole("admin");
          }
        }
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, [setUser, setRole]);

  if (!authChecked || !minLoadingDone) {
    return <BootLoader />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname.split("/")[1] || "root"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="min-h-screen bg-slate-50"
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/" element={
            !user ? <Navigate to="/login" replace /> :
            role === "admin" ? <Navigate to="/admin" replace /> :
            <Navigate to="/dashboard" replace />
          } />
          <Route path="/dashboard/*" element={
            <ProtectedRoute allowedRole="student"><StudentDash /></ProtectedRoute>
          } />
          <Route path="/exam" element={
            <ProtectedRoute allowedRole="student"><ExamRoom /></ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRole="admin"><AdminDash /></ProtectedRoute>
          } />
          <Route path="/result/:id" element={<ResultWrapper />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
