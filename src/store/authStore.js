import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      role: "student",
      setUser: (userData) => set({ user: userData }),
      setRole: (newRole) => set({ role: newRole }),
      logout: () => {
        // Remove presence from Firestore if admin
        const currentUser = get().user;
        if (currentUser) {
          const presenceId = currentUser.uid || currentUser.email?.replace(/@|\./g, "_");
          if (presenceId) {
            deleteDoc(doc(db, "admin_presence", presenceId)).catch(() => {});
          }
        }

        // Sign out from Firebase Auth (covers Google admin login)
        signOut(auth).catch(() => {});
        set({ user: null, role: "student" });
      },
    }),
    {
      name: "cbt-auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
