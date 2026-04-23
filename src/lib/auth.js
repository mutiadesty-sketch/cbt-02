import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// Daftar domain email yang diizinkan login sebagai admin
export const ALLOWED_DOMAINS = [
  "admin.sd.belajar.id",
  "guru.sd.belajar.id",
];

// Cek apakah email termasuk domain atau masuk daftar admin di Firestore
export const isAllowedAdmin = async (email) => {
  // 1. Cek Domain (belajar.id)
  const isDomainAllowed = ALLOWED_DOMAINS.some((d) => email.endsWith(`@${d}`));
  if (isDomainAllowed) return true;

  // 2. Cek Koleksi 'admins' di Firestore
  try {
    const adminDoc = await getDoc(doc(db, "admins", email));
    return adminDoc.exists();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};
