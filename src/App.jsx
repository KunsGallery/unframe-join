import React, { Suspense, useEffect, useMemo, useState } from "react";
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
import { createFallbackOpenCall, pickActiveOpenCall } from "./constants/openCall";
import { lazyPage } from "./lib/lazyPage";
import ErrorBoundary from "./components/ui/ErrorBoundary";

const AdminDashboard = lazyPage(() => import("./views/AdminDashboard"));
const MyPage = lazyPage(() => import("./views/MyPage"));
const SuccessView = lazyPage(() => import("./views/SuccessView"));
const JoinHome = lazyPage(() => import("./views/join/JoinHome"));
const OpenCallLanding = lazyPage(() => import("./views/open-call/OpenCallLanding"));
const OpenCallApplicationForm = lazyPage(() => import("./views/open-call/OpenCallApplicationForm"));
const SalonLanding = lazyPage(() => import("./views/salon/SalonLanding"));
const SalonDetail = lazyPage(() => import("./views/salon/SalonDetail"));
const SalonApplicationForm = lazyPage(() => import("./views/salon/SalonApplicationForm"));
const SalonApplicationComplete = lazyPage(() => import("./views/salon/SalonApplicationComplete"));
const SalonPassPage = lazyPage(() => import("./views/salon/SalonPassPage"));
const SalonCheckInScanner = lazyPage(() => import("./views/admin/SalonCheckInScanner"));
const RentalInfoPage = lazyPage(() => import("./views/RentalInfoPage"));
const RentalInquiryForm = lazyPage(() => import("./views/RentalInquiryForm"));
const CollaborationInfoPage = lazyPage(() => import("./views/CollaborationInfoPage"));

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
  if (pathname === "/rental" || pathname === "/rental/apply") return "rental";
  if (pathname === "/collaboration" || pathname === "/collaboration/apply") return "collaboration";
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
  if (selectedTrack === "rental") return "/rental";
  if (selectedTrack === "collaboration") return "/collaboration";
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
    rentalMode: window.location.pathname === "/rental/apply" ? "apply" : "detail",
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
  rentalMode = "detail",
  salonSlug = "",
  salonId = "",
  salonToken = "",
}) => {
  let pathname = getPathnameForSelectedTrack(selectedTrack, openCallMode);
  if (selectedTrack === "rental" && rentalMode === "apply") pathname = "/rental/apply";
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
  if (view === "admin") {
    const currentAdminTab = new URLSearchParams(window.location.search).get("adminTab");
    if (currentAdminTab) params.set("adminTab", currentAdminTab);
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
  const [rentalMode, setRentalMode] = useState(initialUrlState.rentalMode);
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
  const [reservations, setReservations] = useState({});
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [successTemplateContext, setSuccessTemplateContext] = useState(null);


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

    return pickActiveOpenCall(openCalls);
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
      setRentalMode(next.rentalMode);
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
      rentalMode,
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
    rentalMode,
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

    return () => unsubscribeApp();
  }, [user, isAdmin, viewMode]);

  useEffect(() => {
    if (!isAdmin || viewMode !== "admin") return undefined;

    const resRef = collection(db, "artifacts", appId, "public", "data", "reservations");
    return onSnapshot(resRef, (snap) => {
      const resMap = {};
      snap.forEach((d) => {
        resMap[d.id] = d.data();
      });
      setReservations(resMap);
    });
  }, [isAdmin, viewMode]);

  const handleSelectRentalTrack = () => {
    setSelectedTrack("rental");
    setRentalMode("detail");
    setOpenCallMode("landing");
    setRequestedOpenCallId("");
    setSelectedOpenCall(null);
    setIsSubmitSuccess(false);
    setSuccessTemplateContext(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectOpenCallTrack = () => {
    setSelectedTrack("open-call");
    setOpenCallMode("landing");
    setRequestedOpenCallId("");
    setSelectedOpenCall(null);
    setIsSubmitSuccess(false);
    setSuccessTemplateContext(null);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            setIsSubmitSuccess(false);
            setSuccessTemplateContext(null);
          }

          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        handleLogin={handleLogin}
        handleSignOut={handleSignOut}
        reset={resetAll}
      />

      <main className={`${viewMode === "admin" && isAdmin ? "max-w-[1920px]" : "max-w-7xl"} mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 md:pb-32 relative z-10 text-left`}>
        <ErrorBoundary>
        <Suspense fallback={<LoadingOverlay />}>
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
        ) : viewMode === "admin" && isAdmin ? (
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
                onSelectCollaboration={() => setSelectedTrack("collaboration")}
              />
            ) : selectedTrack === "open-call" ? (
              !resolvedOpenCall ? (
                <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 text-center">
                  <h1 className="text-2xl font-black">현재 공개된 오픈콜이 없습니다.</h1>
                  <p className="mt-3 text-sm text-zinc-600">새 모집이 시작되면 이곳에서 확인하실 수 있습니다.</p>
                  <button type="button" onClick={handleReturnToJoinHome} className="mt-6 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white">메인으로</button>
                </section>
              ) :
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
            ) : selectedTrack === "rental" ? (
              rentalMode === "detail" ? (
                <RentalInfoPage onBack={handleReturnToJoinHome} onContinue={() => {
                  setRentalMode("apply");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }} />
              ) : (
                <RentalInquiryForm
                  db={db}
                  user={user}
                  handleLogin={handleLogin}
                  onViewInquiry={(id) => { setFocusedApplicationId(id); setViewMode("my-page"); }}
                  onBack={() => {
                    setRentalMode("detail");
                    window.history.pushState({}, "", "/rental");
                  }}
                />
              )
            ) : selectedTrack === "collaboration" ? (
              <CollaborationInfoPage db={db} user={user} onBack={handleReturnToJoinHome} handleLogin={handleLogin} onViewInquiry={(id) => { setFocusedApplicationId(id); setViewMode("my-page"); }} />
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
                  user={user}
                  applications={myApplications}
                  onViewApplication={(application) => {
                    setFocusedApplicationId(application.id);
                    setViewMode("my-page");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onViewPass={(token) => {
                    setSalonToken(token);
                    setSalonMode("pass");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onBack={handleReturnToJoinHome}
                  onOpen={(slug) => {
                    setSalonSlug(slug);
                    setSalonMode("detail");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )
            ) : null}
          </div>
        )}
        </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
};

export default App;
