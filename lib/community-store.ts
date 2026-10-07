import {
  getFirestore,
  collection,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { firebaseAuth } from "./firebase-client";
import { firebaseConfig } from "./firebase-config";
import { sampleBlogs } from "./sample-blogs";
import {
  sampleSupport,
  safeCover,
  safeTarget,
  type Blog,
  type Announcement,
  type StudentProfile,
  type SupportContact,
} from "./community-types";
export const firestore = () => getFirestore(firebaseAuth().app);
export const realtime = () => {
  if (!firebaseConfig.databaseURL)
    throw new Error("Realtime Database setup is not complete.");
  return getDatabase(firebaseAuth().app, firebaseConfig.databaseURL);
};
export const cloudError = (e: unknown) => {
  const code = String((e as { code?: string }).code || "");
  return /permission/i.test(code)
    ? "This account cannot access this information yet. The organizer needs to check the database permissions."
    : "Could not connect to the community database. Check your connection and try again.";
};
export function watchBlogs(
  admin: boolean,
  next: (v: Blog[]) => void,
  fail: (e: unknown) => void,
) {
  const root = collection(firestore(), "blogs");
  return onSnapshot(
    admin ? root : query(root, where("published", "==", true)),
    (s) =>
      next(
        s.docs
          .map((d) => ({ ...d.data(), id: d.id }) as Blog)
          .sort((a, b) => b.createdAt - a.createdAt),
      ),
    fail,
  );
}
export function watchSupport(
  admin: boolean,
  next: (v: SupportContact[]) => void,
  fail: (e: unknown) => void,
) {
  const root = collection(firestore(), "support");
  return onSnapshot(
    admin ? root : query(root, where("active", "==", true)),
    (s) =>
      next(s.docs.map((d) => ({ ...d.data(), id: d.id }) as SupportContact)),
    fail,
  );
}
export function watchAnnouncements(
  next: (v: Announcement[]) => void,
  fail: (e: unknown) => void,
) {
  return onValue(
    ref(realtime(), "announcements"),
    (s) =>
      next(
        Object.entries(s.val() || {})
          .map(([id, v]) => ({ ...(v as Announcement), id }))
          .sort((a, b) => b.createdAt - a.createdAt),
      ),
    fail,
  );
}
export function watchProfile(
  uid: string,
  next: (v: StudentProfile | null) => void,
  fail: (e: unknown) => void,
) {
  return onSnapshot(
    doc(firestore(), "profiles", uid),
    (s) => next(s.exists() ? ({ ...s.data(), uid } as StudentProfile) : null),
    fail,
  );
}
export function watchProfiles(
  next: (v: StudentProfile[]) => void,
  fail: (e: unknown) => void,
) {
  return onSnapshot(
    collection(firestore(), "profiles"),
    (s) =>
      next(s.docs.map((d) => ({ ...d.data(), uid: d.id }) as StudentProfile)),
    fail,
  );
}
export async function saveProfile(value: StudentProfile) {
  const user = firebaseAuth().currentUser;
  if (!user || user.uid !== value.uid)
    throw new Error("Sign in to edit your profile.");
  await setDoc(doc(firestore(), "profiles", user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: value.displayName.trim(),
    institution: value.institution.trim(),
    grade: value.grade.trim(),
    phone: value.phone.trim(),
    bio: value.bio.trim(),
    interests: value.interests.trim(),
    updatedAt: serverTimestamp(),
  });
}
export async function ensureProfile() {
  const user = firebaseAuth().currentUser;
  if (!user?.email) return;
  const target = doc(firestore(), "profiles", user.uid);
  await runTransaction(firestore(), async (transaction) => {
    const existing = await transaction.get(target);
    if (existing.exists() || firebaseAuth().currentUser?.uid !== user.uid)
      return;
    transaction.set(target, {
      uid: user.uid,
      email: user.email,
      displayName: (user.displayName || "Student").slice(0, 80),
      institution: "",
      grade: "",
      phone: "",
      bio: "",
      interests: "",
      updatedAt: serverTimestamp(),
    });
  });
}
export async function saveBlog(value: Blog) {
  if (!safeCover(value.cover))
    throw new Error(
      "Use a secure https image URL or one of the site's illustration paths.",
    );
  const { id, ...data } = value;
  await setDoc(doc(firestore(), "blogs", id), {
    ...data,
    updatedAt: Date.now(),
  });
}
export async function saveSupport(value: SupportContact) {
  const { id, ...data } = value;
  await setDoc(doc(firestore(), "support", id), data);
}
export async function saveAnnouncement(value: Announcement) {
  if (value.target && !safeTarget(value.target))
    throw new Error("Choose a valid page or event inside ClubOS.");
  const { id, ...data } = value;
  await set(ref(realtime(), `announcements/${id}`), {
    ...data,
    updatedAt: Date.now(),
  });
}
export function watchRead(
  uid: string,
  next: (time: number) => void,
  fail: (e: unknown) => void,
) {
  return onValue(
    ref(realtime(), `notificationReads/${uid}`),
    (s) => next(Number(s.val()) || 0),
    fail,
  );
}
export async function markRead(uid: string, time: number) {
  await set(ref(realtime(), `notificationReads/${uid}`), time);
}
export async function initializeCommunity() {
  const db = firestore();
  await runTransaction(db, async (transaction) => {
    const flag = doc(db, "settings", "communitySeed");
    if ((await transaction.get(flag)).exists()) return;
    const entries = [
      ...sampleBlogs.map(({ id, ...data }) => ({
        target: doc(db, "blogs", id),
        data,
      })),
      ...sampleSupport.map(({ id, ...data }) => ({
        target: doc(db, "support", id),
        data,
      })),
    ];
    const existing = await Promise.all(
      entries.map((entry) => transaction.get(entry.target)),
    );
    entries.forEach((entry, index) => {
      if (!existing[index].exists()) transaction.set(entry.target, entry.data);
    });
    transaction.set(flag, { version: 1, createdAt: serverTimestamp() });
  });
}
