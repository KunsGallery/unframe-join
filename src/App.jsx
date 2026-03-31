import React, { useEffect, useMemo, useState } from "react";
import {
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { ADMIN_EMAILS } from "./constants/admin";
import { auth, db, googleProvider, appId } from "./lib/firebase";
import LoadingOverlay from "./components/ui/LoadingOverlay";
import ParticleBackground from "./components/ui/ParticleBackground";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import LandingPage from "./views/LandingPage";
import PartnerSelectStep from "./views/PartnerSelectStep";
import CalendarStep from "./views/CalendarStep";
import ProposalFormStep from "./views/ProposalFormStep";
import AdminDashboard from "./views/AdminDashboard";
import MyPage from "./views/MyPage";
import SuccessView from "./views/SuccessView";

const EMPTY_FORM_DATA = {
  name: "",
  realName: "",
  stageName: "",
  englishName: "",
  birthDate: "",
  phone: "",
  addressMain: "",
  addressDetail: "",
  profilePhotoUrl: "",
  snsLink: "",
  portfolioUrl: "",
  exhibitionTitle: "",
  artistNote: "",
  workListUrl: "",
  highResPhotosUrl: "",
  experimentText: "",
  brandName: "",
  brandRole: "",
  projectPurpose: "",
  targetAudience: "",
  budgetRange: "",
  privacyAgreed: false,
};

const getUrlState = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get("view") || "user",
    app: params.get("app") || "",
  };
};

const setUrlState = ({ view = "user", app = "" }) => {
  const params = new URLSearchParams(window.location.search);

  if (view && view !== "user") {
    params.set("view", view);
  } else {
    params.delete("view");
  }

  if (app) {
    params.set("app", app);
  } else {
    params.delete("app");
  }

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.pushState({}, "", nextUrl);
};

const App = () => {
  const initialUrlState = getUrlState();

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState(initialUrlState.view);
  const [focusedApplicationId, setFocusedApplicationId] = useState(initialUrlState.app);
  const [currentStep, setCurrentStep] = useState(1);
  const [reservations, setReservations] = useState({});
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  const [partnerType, setPartnerType] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM_DATA);

  const myApplications = useMemo(() => {
    if (!user || user.isAnonymous) return [];
    return applications.filter((app) => app.userId === user.uid);
  }, [applications, user]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error(e);
        }
      } else {
        setUser(u);
        setIsAdmin(ADMIN_EMAILS.includes(u.email));
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const next = getUrlState();
      setViewMode(next.view);
      setFocusedApplicationId(next.app);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!user) return;

    const resRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "reservations"
    );
    const unsubscribeRes = onSnapshot(resRef, (snap) => {
      const resMap = {};
      snap.forEach((d) => {
        resMap[d.id] = d.data();
      });
      setReservations(resMap);
    });

    const appRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "applications"
    );
    const appQuery =
      isAdmin && viewMode === "admin"
        ? appRef
        : query(appRef, where("userId", "==", user.uid));

    const unsubscribeApp = onSnapshot(
      appQuery,
      (snap) => {
        const appList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setApplications(appList);
      },
      () => {
        console.warn("Application access limited by security rules");
      }
    );

    return () => {
      unsubscribeRes();
      unsubscribeApp();
    };
  }, [user, isAdmin, viewMode]);

  useEffect(() => {
    if (viewMode === "user") {
      setUrlState({ view: "user", app: "" });
      return;
    }

    if (viewMode === "my-page") {
      setUrlState({ view: "my-page", app: focusedApplicationId });
      return;
    }

    if (viewMode === "admin") {
      setUrlState({ view: "admin", app: "" });
    }
  }, [viewMode, focusedApplicationId]);

  const handleStepTransition = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleSignOut = () => signOut(auth).then(() => window.location.reload());

  const resetAll = () => {
    setCurrentStep(1);
    setIsSubmitSuccess(false);
    setSelectedDate(null);
    setSelectedProgram(null);
    setPartnerType("");
    setFormData(EMPTY_FORM_DATA);
    setFocusedApplicationId("");
    setViewMode("user");
    setUrlState({ view: "user", app: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-zinc-900 font-sans selection:bg-[#004aad] selection:text-white relative overflow-x-hidden">
      <ParticleBackground />

      <Navbar
        user={user}
        isAdmin={isAdmin}
        viewMode={viewMode}
        setViewMode={(v) => {
          setViewMode(v);
          if (v !== "my-page") {
            setFocusedApplicationId("");
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        handleLogin={handleLogin}
        handleSignOut={handleSignOut}
        reset={resetAll}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 md:pb-32 relative z-10 text-left">
        {isSubmitSuccess ? (
          <SuccessView
            onReturn={() => {
              setIsSubmitSuccess(false);
              handleStepTransition(1);
            }}
          />
        ) : viewMode === "admin" ? (
          <AdminDashboard
            applications={applications}
            reservations={reservations}
            db={db}
            appId={appId}
          />
        ) : viewMode === "my-page" ? (
          <MyPage
            applications={myApplications}
            handleReturn={() => {
              setFocusedApplicationId("");
              setViewMode("user");
            }}
            db={db}
            appId={appId}
            user={user}
            focusedApplicationId={focusedApplicationId}
          />
        ) : (
          <div className="transition-all duration-700">
            {currentStep === 1 && (
              <LandingPage
                onSelectProgram={(program) => {
                  setSelectedProgram(program);
                  handleStepTransition(2);

                  setTimeout(() => {
                    const target = document.getElementById("partner-type-section");
                    if (target) {
                      target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }, 120);
                }}
              />
            )}

            {currentStep === 2 && (
              <PartnerSelectStep
                onSelect={(type) => {
                  setPartnerType(type);
                  handleStepTransition(3);
                }}
                onBack={() => handleStepTransition(1)}
              />
            )}

            {currentStep === 3 && (
              <CalendarStep
                reservations={reservations}
                onSelect={(date) => {
                  if (!user || user.isAnonymous) return handleLogin();
                  setSelectedDate(date);
                }}
                onConfirm={() => handleStepTransition(4)}
                selectedDate={selectedDate}
                onBack={() => handleStepTransition(2)}
              />
            )}

            {currentStep === 4 && (
              <ProposalFormStep
                selectedDate={selectedDate}
                partnerType={partnerType}
                selectedProgram={selectedProgram}
                formData={formData}
                setFormData={setFormData}
                onBack={() => handleStepTransition(3)}
                onSubmitSuccess={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setIsSubmitSuccess(true);
                }}
                db={db}
                appId={appId}
                user={user}
                handleLogin={handleLogin}
                setSelectedDate={setSelectedDate}
                setSelectedProgram={setSelectedProgram}
                setPartnerType={setPartnerType}
              />
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;