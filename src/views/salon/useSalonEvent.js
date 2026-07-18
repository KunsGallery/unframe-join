import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { appId, db } from "../../lib/firebase";
import { normalizeSalonEvent, SALON_EVENT_COLLECTION } from "../../constants/salon";

export const useSalonEvent = (slug) => {
  const [state, setState] = useState({ loading: true, event: null, error: "" });
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const ref = collection(db, "artifacts", appId, "public", "data", SALON_EVENT_COLLECTION);
        const snapshot = await getDocs(query(ref, where("slug", "==", slug)));
        let item = snapshot.docs[0];
        if (!item) {
          const direct = await getDoc(doc(db, "artifacts", appId, "public", "data", SALON_EVENT_COLLECTION, slug));
          if (direct.exists()) item = direct;
        }
        if (!active) return;
        setState(item ? { loading: false, event: normalizeSalonEvent({ id: item.id, ...item.data() }), error: "" } : { loading: false, event: null, error: "SALON을 찾을 수 없습니다." });
      } catch (error) {
        if (active) setState({ loading: false, event: null, error: error.message || "SALON을 불러오지 못했습니다." });
      }
    };
    load();
    return () => { active = false; };
  }, [slug]);
  return state;
};
