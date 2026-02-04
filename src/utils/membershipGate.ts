type MembershipRequiredPayload = { source?: string };
type Listener = (payload: MembershipRequiredPayload) => void;

const listeners = new Set<Listener>();

export function emitMembershipRequired(payload: MembershipRequiredPayload = {}) {
  for (const cb of listeners) {
    try {
      cb(payload);
    } catch {
      // ignore listener errors
    }
  }
}

export function onMembershipRequired(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

