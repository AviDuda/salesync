import type { EventAppPlatformStatus } from "@prisma/client";

export function isPlatformStatusOK(status?: EventAppPlatformStatus) {
  return status?.startsWith("OK_");
}
