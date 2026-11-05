import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { appId, db } from "../../lib/firebase";
import LoadingOverlay from "../../components/ui/LoadingOverlay";
import OpenCallChapters from "./OpenCallChapters";
import { pickActiveOpenCall } from "../../constants/openCall";
import { buildOpenCallView } from "./openCallView";

const OpenCallLanding = ({ onBack, onApply }) => {
  const [openCalls, setOpenCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "artifacts", appId, "public", "data", "openCalls");
    return onSnapshot(
      ref,
      (snapshot) => {
        setOpenCalls(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );
  }, []);

  const view = useMemo(() => buildOpenCallView(pickActiveOpenCall(openCalls)), [openCalls]);

  if (loading) return <LoadingOverlay />;

  return <OpenCallChapters {...view} onBack={onBack} onApply={() => view.canApply && onApply(view.openCall)} />;
};

export default OpenCallLanding;
