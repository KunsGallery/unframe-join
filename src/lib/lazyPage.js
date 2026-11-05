import { lazy } from "react";

const RELOAD_FLAG = "unframe:chunk-reload";

// A tab left open across a deploy requests chunk files that no longer exist.
// Reloading once picks up the new build; the flag stops a reload loop when the failure is real.
export const loadWithReload = async (load, { storage, reload }) => {
  try {
    const module = await load();
    try {
      storage.removeItem(RELOAD_FLAG);
    } catch {
      // Blocked storage must not fail a successful load.
    }
    return module;
  } catch (error) {
    let shouldReload = false;
    try {
      if (!storage.getItem(RELOAD_FLAG)) {
        storage.setItem(RELOAD_FLAG, "1");
        shouldReload = true;
      }
    } catch {
      // Without storage a reload could never be limited, so surface the error instead.
    }
    if (!shouldReload) throw error;
    reload();
    return new Promise(() => {});
  }
};

const getSessionStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const lazyPage = (load) =>
  lazy(() =>
    loadWithReload(load, {
      storage: getSessionStorage(),
      reload: () => window.location.reload(),
    })
  );
