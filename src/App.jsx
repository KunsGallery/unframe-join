import React, { useEffect, useMemo, useState } from "react";
import {
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";

import { isAdminEmail } from "./constants/admin";
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
import JoinHome from "./views/join/JoinHome";
import OpenCallLanding from "./views/open-call/OpenCallLanding";
import OpenCallApplicationForm from "./views/open-call/OpenCallApplicationForm";
import SalonLanding from "./views/salon/SalonLanding";
import SalonDetail from "./views/salon/SalonDetail";
import SalonApplicationForm from "./views/salon/SalonApplicationForm";
import SalonApplicationComplete from "./views/salon/SalonApplicationComplete";
import SalonPassPage from "./views/salon/SalonPassPage";
import SalonCheckInScanner from "./views/admin/SalonCheckInScanner";
import { createFallbackOpenCall, pickActiveOpenCall } from "./constants/openCall";

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

const EMPTY_PROFILE_DATA = {
  realName: "",
  stageName: "",
  englishName: "",
  brandName: "",
  phone: "",
  addressMain: "",
  addressDetail: "",
  snsLink: "",
};

const getSelectedTrackFromPathname = (pathname) => {
  if (pathname === "/opencall" || pathname === "/opencall/apply") return "open-call";
  if (pathname === "/salon" || pathname.startsWith("/salon/") || pathname.startsWith("/admin/salon/")) return "salon";
  return null;
};

const getSalonRouteFromUrl = (pathname, params) => {
  const adminMatch = pathname.match(/^\/admin\/salon\/check-in\/([^/]+)$/);
  if (adminMatch) return { salonMode: "admin-check-in", salonSlug: "", salonId: decodeURIComponent(adminMatch[1]), salonToken: "" };
  if (pathname === "/salon/pass" || pathname === "/salon/check-in-token") return { salonMode: "pass", salonSlug: "", salonId: "", salonToken: params.get("token") || "" };
  if (pathname === "/salon/application-complete") return { salonMode: "complete", salonSlug: "", salonId: "", salonToken: "" };
  const applyMatch = pathname.match(/^\/salon\/([^/]+)\/apply$/);
  if (applyMatch) return { salonMode: "apply", salonSlug: decodeURIComponent(applyMatch[1]), salonId: "", salonToken: "" };
  const detailMatch = pathname.match(/^\/salon\/([^/]+)$/);
  if (detailMatch) return { salonMode: "detail", salonSlug: decodeURIComponent(detailMatch[1]), salonId: "", salonToken: "" };
  return { salonMode: "landing", salonSlug: "", salonId: "", salonToken: "" };
};

const getOpenCallModeFromUrl = (pathname, params) => {
  if (pathname === "/opencall/apply") return "form";
  if (params.get("mode") === "form") return "form";
  return "landing";
};

const getPathnameForSelectedTrack = (selectedTrack, openCallMode = "landing") => {
  if (selectedTrack === "open-call") {
    return openCallMode === "form" ? "/opencall/apply" : "/opencall";
  }
  if (selectedTrack === "salon") return "/salon";
  return "/";
};

const getUrlState = () => {
  const params = new URLSearchParams(window.location.search);
  const salonRoute = getSalonRouteFromUrl(window.location.pathname, params);
  return {
    selectedTrack: getSelectedTrackFromPathname(window.location.pathname),
    view: salonRoute.salonMode === "admin-check-in" ? "admin" : params.get("view") || "user",
    app: params.get("app") || "",
    openCallMode: getOpenCallModeFromUrl(window.location.pathname, params),
    openCallId: params.get("openCallId") || "",
    ...salonRoute,
  };
};

const buildUrl = ({
  selectedTrack,
  view = "user",
  app = "",
  openCallMode = "landing",
  openCallId = "",
  salonMode = "landing",
  salonSlug = "",
  salonId = "",
  salonToken = "",
}) => {
  let pathname = getPathnameForSelectedTrack(selectedTrack, openCallMode);
  const params = new URLSearchParams();

  if (selectedTrack === "salon") {
    if (salonMode === "detail" && salonSlug) pathname = `/salon/${encodeURIComponent(salonSlug)}`;
    else if (salonMode === "apply" && salonSlug) pathname = `/salon/${encodeURIComponent(salonSlug)}/apply`;
    else if (salonMode === "complete") pathname = "/salon/application-complete";
    else if (salonMode === "pass") pathname = "/salon/pass";
    else if (salonMode === "admin-check-in" && salonId) pathname = `/admin/salon/check-in/${encodeURIComponent(salonId)}`;
    if (salonMode === "pass" && salonToken) params.set("token", salonToken);
  }

  if (view && view !== "user" && salonMode !== "admin-check-in") {
    params.set("view", view);
  }

  if (app) {
    params.set("app", app);
  }

  if (selectedTrack === "open-call" && openCallMode === "form" && openCallId) {
    params.set("openCallId", openCallId);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const App = () => {
  const initialUrlState = getUrlState();

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(initialUrlState.selectedTrack);
  const [viewMode, setViewMode] = useState(initialUrlState.view);
  const [focusedApplicationId, setFocusedApplicationId] = useState(initialUrlState.app);
  const [openCallMode, setOpenCallMode] = useState(initialUrlState.openCallMode);
  const [requestedOpenCallId, setRequestedOpenCallId] = useState(initialUrlState.openCallId);
  const [salonMode, setSalonMode] = useState(initialUrlState.salonMode);
  const [salonSlug, setSalonSlug] = useState(initialUrlState.salonSlug);
  const [salonId, setSalonId] = useState(initialUrlState.salonId);
  const [salonToken, setSalonToken] = useState(initialUrlState.salonToken);
  const [salonCompleteContext, setSalonCompleteContext] = useState(null);
  const [selectedOpenCall, setSelectedOpenCall] = useState(null);
  const [openCalls, setOpenCalls] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [reservations, setReservations] = useState({});
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [successTemplateContext, setSuccessTemplateContext] = useState(null);

  const [partnerType, setPartnerType] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [savedProfileData, setSavedProfileData] = useState(EMPTY_PROFILE_DATA);

  const myApplications = useMemo(() => {
    if (!user || user.isAnonymous) return [];
    return applications.filter((app) => app.userId === user.uid);
  }, [applications, user]);

  const resolvedOpenCall = useMemo(() => {
    if (!Array.isArray(openCalls) || openCalls.length === 0) return null;

    if (requestedOpenCallId) {
      return openCalls.find((call) => call.id === requestedOpenCallId) || null;
    }

    return pickActiveOpenCall(openCalls) || openCalls[0] || null;
  }, [openCalls, requestedOpenCallId]);

  const selectedOpenCallView = useMemo(
    () => {
      const source = selectedOpenCall || resolvedOpenCall;
      return source ? createFallbackOpenCall(source) : null;
    },
    [resolvedOpenCall, selectedOpenCall]
  );

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
        setIsAdmin(isAdminEmail(u.email));
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const next = getUrlState();
      setSelectedTrack(next.selectedTrack);
      setViewMode(next.view);
      setFocusedApplicationId(next.app);
      setOpenCallMode(next.openCallMode);
      setRequestedOpenCallId(next.openCallId);
      setSalonMode(next.salonMode);
      setSalonSlug(next.salonSlug);
      setSalonId(next.salonId);
      setSalonToken(next.salonToken);
      setSelectedOpenCall(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const nextUrl = buildUrl({
      selectedTrack,
      view: viewMode,
      app: focusedApplicationId,
      openCallMode,
      openCallId:
        selectedTrack === "open-call" && openCallMode === "form"
          ? selectedOpenCallView?.id || requestedOpenCallId
          : "",
      salonMode,
      salonSlug,
      salonId,
      salonToken,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.pushState({}, "", nextUrl);
    }
  }, [
    focusedApplicationId,
    openCallMode,
    requestedOpenCallId,
    selectedOpenCallView?.id,
    selectedTrack,
    salonId,
    salonMode,
    salonSlug,
    salonToken,
    viewMode,
  ]);

  useEffect(() => {
    if (selectedTrack !== "open-call") {
      return;
    }

    const ref = collection(db, "artifacts", appId, "public", "data", "openCalls");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setOpenCalls(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (error) => {
        console.error(error);
        setOpenCalls([]);
      }
    );

    return () => unsubscribe();
  }, [selectedTrack]);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      return;
    }

    const loadSavedProfile = async () => {
      try {
        const ref = doc(db, "artifacts", appId, "users", user.uid, "profile", "basic");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setSavedProfileData({
            ...EMPTY_PROFILE_DATA,
            ...snap.data(),
          });
        } else {
          setSavedProfileData({
            ...EMPTY_PROFILE_DATA,
            realName: user.displayName || "",
          });
        }
      } catch (error) {
        console.error(error);
        setSavedProfileData({
          ...EMPTY_PROFILE_DATA,
          realName: user.displayName || "",
        });
      }
    };

    loadSavedProfile();
  }, [user]);

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

  const handleStepTransition = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectRentalTrack = () => {
    setSelectedTrack("rental");
    setOpenCallMode("landing");
    setRequestedOpenCallId("");
    setSelectedOpenCall(null);
    setIsSubmitSuccess(false);
    setSuccessTemplateContext(null);
    setSelectedDate(null);
    setSelectedProgram(null);
    setPartnerType("");
    setFormData(EMPTY_FORM_DATA);
    handleStepTransition(1);
  };

  const handleSelectOpenCallTrack = () => {
    setSelectedTrack("open-call");
    setOpenCallMode("landing");
    setRequestedOpenCallId("");
    setSelectedOpenCall(null);
    setIsSubmitSuccess(false);
    setSuccessTemplateContext(null);
    setSelectedDate(null);
    setSelectedProgram(null);
    setPartnerType("");
    setCurrentStep(1);
    setFormData(EMPTY_FORM_DATA);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectSalonTrack = () => {
    setSelectedTrack("salon");
    setSalonMode("landing");
    setSalonSlug("");
    setSalonId("");
    setSalonToken("");
    setOpenCallMode("landing");
    setRequestedOpenCallId("");
    setSelectedOpenCall(null);
    setIsSubmitSuccess(false);
    setSuccessTemplateContext(null);
    setSelectedDate(null);
    setSelectedProgram(null);
    setPartnerType("");
    setCurrentStep(1);
    setFormData(EMPTY_FORM_DATA);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReturnToJoinHome = () => {
    setSelectedTrack(null);
    setSalonMode("landing");
    setSalonSlug("");
    setSalonId("");
    setSalonToken("");
    setOpenCallMode("landing");
    setRequestedOpenCallId("");
    setSelectedOpenCall(null);
    setIsSubmitSuccess(false);
    setSuccessTemplateContext(null);
    setSelectedDate(null);
    setSelectedProgram(null);
    setPartnerType("");
    setFormData(EMPTY_FORM_DATA);
    handleStepTransition(1);
  };

  const handleReturnToOpenCallLanding = () => {
    setIsSubmitSuccess(false);
    setSuccessTemplateContext(null);
    setOpenCallMode("landing");
    setRequestedOpenCallId("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleSignOut = () => signOut(auth).then(() => window.location.reload());
  const handleSalonApply = async () => {
    if (!user || user.isAnonymous) {
      try {
        await handleLogin();
      } catch (error) {
        console.error(error);
        return;
      }
    }
    setSalonMode("apply");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetAll = () => {
    setCurrentStep(1);
    setSelectedTrack(null);
    setSalonMode("landing");
    setSalonSlug("");
    setSalonId("");
    setSalonToken("");
    setOpenCallMode("landing");
    setRequestedOpenCallId("");
    setSelectedOpenCall(null);
    setIsSubmitSuccess(false);
    setSuccessTemplateContext(null);
    setSelectedDate(null);
    setSelectedProgram(null);
    setPartnerType("");
    setFormData(EMPTY_FORM_DATA);
    setFocusedApplicationId("");
    setViewMode("user");
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

          if (v === "user") {
            setSelectedTrack(null);
            setOpenCallMode("landing");
            setRequestedOpenCallId("");
            setSelectedOpenCall(null);
            setCurrentStep(1);
            setIsSubmitSuccess(false);
            setSuccessTemplateContext(null);
            setSelectedDate(null);
            setSelectedProgram(null);
            setPartnerType("");
            setFormData(EMPTY_FORM_DATA);
          }

          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        handleLogin={handleLogin}
        handleSignOut={handleSignOut}
        reset={resetAll}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 md:pb-32 relative z-10 text-left">
        {selectedTrack === "salon" && salonMode === "pass" ? (
          <SalonPassPage token={salonToken} />
        ) : selectedTrack === "salon" && salonMode === "admin-check-in" ? (
          <SalonCheckInScanner
            salonId={salonId}
            applications={applications}
            isAdmin={isAdmin}
          />
        ) : isSubmitSuccess ? (
          <SuccessView
            trackType={selectedTrack}
            completionSettings={selectedOpenCallView?.completionSettings}
            templateContext={successTemplateContext}
            onReturn={() => {
              handleReturnToJoinHome();
            }}
            onSecondaryAction={
              selectedTrack === "open-call" ? handleReturnToOpenCallLanding : undefined
            }
          />
        ) : viewMode === "admin" ? (
          <AdminDashboard
            applications={applications}
            reservations={reservations}
            db={db}
            appId={appId}
            user={user}
            isAdmin={isAdmin}
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
            {selectedTrack === null ? (
              <JoinHome
                onSelectRental={() => handleSelectRentalTrack()}
                onSelectOpenCall={() => handleSelectOpenCallTrack()}
                onSelectSalon={() => handleSelectSalonTrack()}
              />
            ) : selectedTrack === "open-call" ? (
              openCallMode === "landing" ? (
                <OpenCallLanding
                  onBack={handleReturnToJoinHome}
                  onApply={(openCall) => {
                    setSelectedOpenCall(openCall || null);
                    setRequestedOpenCallId(openCall?.id || "");
                    setOpenCallMode("form");
                  }}
                />
              ) : (
                <OpenCallApplicationForm
                  openCall={selectedOpenCallView}
                  db={db}
                  appId={appId}
                  user={user}
                  handleLogin={handleLogin}
                  initialProfileData={savedProfileData}
                  onBack={handleReturnToOpenCallLanding}
                  onSubmitSuccess={(successContext) => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setSuccessTemplateContext(successContext || null);
                    setIsSubmitSuccess(true);
                  }}
                />
              )
            ) : selectedTrack === "salon" ? (
              salonMode === "detail" ? (
                <SalonDetail
                  slug={salonSlug}
                  user={user}
                  applications={applications}
                  onBack={() => {
                    setSalonMode("landing");
                    setSalonSlug("");
                  }}
                  onApply={handleSalonApply}
                  onViewApplication={(application) => {
                    setFocusedApplicationId(application.id);
                    setViewMode("my-page");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ) : salonMode === "apply" ? (
                !user || user.isAnonymous ? (
                  <div className="mx-auto max-w-xl rounded-[32px] border-2 border-zinc-900 bg-white p-7 text-center shadow-[6px_6px_0px_#000]">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#004aad]">Login required</p>
                    <h1 className="mt-3 text-3xl font-black tracking-tight">로그인 후 신청할 수 있습니다.</h1>
                    <p className="mt-3 text-sm font-bold leading-6 text-zinc-500 break-keep">참가 신청서를 작성하기 전에 먼저 로그인해 주세요.</p>
                    <button type="button" onClick={handleSalonApply} className="mt-6 rounded-full bg-[#004aad] px-6 py-3 text-sm font-black text-white">로그인하고 신청하기</button>
                  </div>
                ) : (
                  <SalonApplicationForm
                    slug={salonSlug}
                    user={user}
                    initialProfileData={savedProfileData}
                    onBack={() => setSalonMode("detail")}
                    onComplete={(context) => {
                      setSalonCompleteContext(context);
                      setSalonMode("complete");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )
              ) : salonMode === "complete" ? (
                <SalonApplicationComplete
                  context={salonCompleteContext}
                  onHome={() => {
                    setSalonMode("landing");
                    setSalonSlug("");
                  }}
                />
              ) : (
                <SalonLanding
                  onBack={handleReturnToJoinHome}
                  onOpen={(slug) => {
                    setSalonSlug(slug);
                    setSalonMode("detail");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )
            ) : (
              <>
                <div className="mb-4 md:mb-6 flex justify-start">
                  <button
                    type="button"
                    onClick={handleReturnToJoinHome}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:border-[#004aad]/20 hover:text-[#004aad]"
                  >
                    ← 신청 유형 다시 선택
                  </button>
                </div>

                {selectedTrack === "rental" && currentStep === 1 && (
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

                {selectedTrack === "rental" && currentStep === 2 && (
                  <PartnerSelectStep
                    onSelect={(type) => {
                      setPartnerType(type);
                      handleStepTransition(3);
                    }}
                    onBack={() => handleStepTransition(1)}
                  />
                )}

                {selectedTrack === "rental" && currentStep === 3 && (
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

                {selectedTrack === "rental" && currentStep === 4 && (
                  <ProposalFormStep
                    selectedDate={selectedDate}
                    partnerType={partnerType}
                    selectedProgram={selectedProgram}
                    formData={formData}
                    setFormData={setFormData}
                    onBack={() => handleStepTransition(3)}
                    onSubmitSuccess={() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      setSuccessTemplateContext(null);
                      setIsSubmitSuccess(true);
                    }}
                    db={db}
                    appId={appId}
                    user={user}
                    handleLogin={handleLogin}
                    setSelectedDate={setSelectedDate}
                    setSelectedProgram={setSelectedProgram}
                    setPartnerType={setPartnerType}
                    initialProfileData={savedProfileData}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
