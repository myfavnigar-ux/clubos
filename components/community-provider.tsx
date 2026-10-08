"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "./account";
import type { Blog, Announcement, SupportContact } from "@/lib/community-types";
import { sampleBlogs } from "@/lib/sample-blogs";
import { sampleSupport } from "@/lib/community-types";
type Community = {
  blogs: Blog[];
  announcements: Announcement[];
  support: SupportContact[];
  error: string;
  noticeError: string;
  loading: boolean;
  sample: boolean;
  seen: number;
  markAllRead: () => Promise<void>;
};
const Context = createContext<Community | null>(null);
export const useCommunity = () => useContext(Context)!;
export function CommunityProvider(props: {
  admin: boolean;
  children: ReactNode;
}) {
  const account = useAccount();
  if (account.demo)
    return (
      <Context.Provider
        value={{
          blogs: sampleBlogs,
          announcements: [],
          support: sampleSupport,
          error: "",
          noticeError: "",
          loading: false,
          sample: true,
          seen: 0,
          markAllRead: async () => {},
        }}
      >
        {props.children}
      </Context.Provider>
    );
  return <FirebaseCommunityProvider {...props} />;
}
function FirebaseCommunityProvider({
  admin,
  children,
}: {
  admin: boolean;
  children: ReactNode;
}) {
  const account = useAccount();
  const [blogs, setBlogs] = useState<Blog[]>(sampleBlogs),
    [announcements, setAnnouncements] = useState<Announcement[]>([]),
    [support, setSupport] = useState<SupportContact[]>(sampleSupport);
  const [error, setError] = useState(""),
    [noticeError, setNoticeError] = useState(""),
    [loading, setLoading] = useState(true),
    [sample, setSample] = useState(true),
    [seen, setSeen] = useState(0);
  useEffect(() => {
    if (!account.ready) return;
    let active = true;
    const stops: (() => void)[] = [];
    setError("");
    setNoticeError("");
    setBlogs(sampleBlogs);
    setSample(true);
    setLoading(true);
    setSupport(sampleSupport);
    setAnnouncements([]);
    setSeen(0);
    import("@/lib/community-store")
      .then(async (store) => {
        if (!active) return;
        const fail = (e: unknown) => {
          if (active) {
            setError(store.cloudError(e));
            setLoading(false);
          }
        };
        stops.push(
          store.watchBlogs(
            admin,
            (v) => {
              if (active) {
                setBlogs(v);
                setSample(false);
                setLoading(false);
              }
            },
            fail,
          ),
        );
        stops.push(
          store.watchSupport(
            admin,
            (v) => {
              if (active) setSupport(v);
            },
            fail,
          ),
        );
        try {
          stops.push(
            store.watchAnnouncements(
              (v) => {
                if (active) setAnnouncements(v);
              },
              () => {
                if (active)
                  setNoticeError(
                    "Announcements are temporarily unavailable. Please try again later.",
                  );
              },
            ),
          );
          if (account.user)
            stops.push(
              store.watchRead(
                account.user.uid,
                (v) => {
                  if (active) setSeen(v);
                },
                fail,
              ),
            );
          else
            setSeen(
              Number(localStorage.getItem("clubos-notifications-seen")) || 0,
            );
        } catch {
          if (active) setNoticeError("Announcements are not connected yet.");
        }
        if (account.user) await store.ensureProfile().catch(fail);
        if (active && admin) await store.initializeCommunity().catch(fail);
      })
      .catch(() => {
        if (active) {
          setError("Community content could not load. Please refresh.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
      stops.forEach((stop) => stop());
    };
  }, [account.ready, account.user?.uid, admin]);
  async function markAllRead() {
    const value = Date.now();
    if (account.user) {
      const store = await import("@/lib/community-store");
      await store.markRead(account.user.uid, value);
    } else localStorage.setItem("clubos-notifications-seen", String(value));
    setSeen(value);
  }
  return (
    <Context.Provider
      value={{
        blogs,
        announcements,
        support,
        error,
        noticeError,
        loading,
        sample,
        seen,
        markAllRead,
      }}
    >
      {children}
    </Context.Provider>
  );
}
