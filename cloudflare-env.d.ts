declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CLUBOS_ADMIN_UIDS?: string;
    CLUBOS_VAPID_PUBLIC?: string;
    CLUBOS_VAPID_PRIVATE?: string;
    CLUBOS_REMINDERS_ENABLED?: string;
    BUCKET?: R2Bucket;
  }
}
