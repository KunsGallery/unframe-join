import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
  getAuth, signInWithPopup, signInAnonymously, GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  serverTimestamp, updateDoc, addDoc, deleteDoc, increment 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { 
  User, ArrowRight, CheckCircle2, Sparkles, Globe, ChevronLeft, ChevronRight, 
  Save, Upload, FileText, LayoutDashboard, Users, Loader2, Image as ImageIcon,
  Megaphone, Cpu, Coffee, Truck, ShieldCheck, Briefcase as PortfolioIcon, XCircle, CheckCircle, MessageCircle,
  Building2, Palette, Clock, ParkingCircle, Info as InfoIcon, Calendar, Edit3, Trash2, PieChart, Activity
} from 'lucide-react';

// --- CONFIGURATION ---
const ADMIN_EMAILS = ["gallerykuns@gmail.com", "sklove887@gmail.com"];

const getEnv = (key) => {
  try { return import.meta.env[key] || ""; } catch (e) { return ""; }
};

const CLOUDINARY_NAME = getEnv('VITE_CLOUDINARY_CLOUD_NAME');
const CLOUDINARY_PRESET = getEnv('VITE_CLOUDINARY_UPLOAD_PRESET');
const KAKAO_JS_KEY = getEnv('VITE_KAKAO_JS_KEY');

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "unframe-join";

const sendAlimTalk = async (phone, template, data) => {
  console.log(`[ALIMTALK] To: ${phone}, Template: ${template}`, data);
};

// --- HELPERS ---
const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const isDateInRange = (target, start, end) => {
  return target >= start && target <= end;
};

// --- BACKGROUND PARTICLE COMPONENT ---
const ParticleBackground = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.3;
      }
      update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > canvas.width) this.x = 0; else if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0; else if (this.y < 0) this.y = canvas.height;
      }
      draw() {
        ctx.fillStyle = `rgba(0, 74, 173, ${this.opacity})`;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animationFrameId = requestAnimationFrame(animate);
    };
    window.addEventListener('resize', resize); resize();
    for (let i = 0; i < 40; i++) particles.push(new Particle());
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// --- LOADING OVERLAY COMPONENT ---
const LoadingOverlay = () => (
  <div className="h-screen flex flex-col items-center justify-center font-black text-[#004aad] bg-[#fdfbf7] fixed inset-0 z-[200]">
    <Loader2 className="animate-spin size-12 mb-4" />
    <span className="animate-pulse tracking-[0.5em] uppercase text-xs text-zinc-400">Unframe Resonance</span>
  </div>
);

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState('user'); 
  const [currentStep, setCurrentStep] = useState(1); 
  const [reservations, setReservations] = useState({});
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  const [partnerType, setPartnerType] = useState(''); 
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    name: '', birthDate: '', phone: '', addressMain: '', addressDetail: '',
    profilePhotoUrl: '', snsLink: '', portfolioUrl: '', exhibitionTitle: '',
    artistNote: '', workListUrl: '', highResPhotosUrl: '', experimentText: '',
    privacyAgreed: false
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) { console.error("Anon login failed", e); }
      } else {
        setUser(u);
        setIsAdmin(ADMIN_EMAILS.includes(u.email));
        if (!u.isAnonymous) {
          const draftRef = doc(db, 'artifacts', appId, 'users', u.uid, 'drafts', 'current');
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            setFormData(prev => ({ ...prev, ...draftSnap.data().formData }));
          }
        }
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const resRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservations');
    const unsubscribeRes = onSnapshot(resRef, (snap) => {
      const resMap = {};
      snap.forEach(d => { resMap[d.id] = d.data(); });
      setReservations(resMap);
    });

    let unsubscribeApp = () => {};
    if (isAdmin && viewMode === 'admin') {
      const appRef = collection(db, 'artifacts', appId, 'public', 'data', 'applications');
      unsubscribeApp = onSnapshot(appRef, (snap) => {
        setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Admin permissions error", err));
    }
    return () => { unsubscribeRes(); unsubscribeApp(); };
  }, [user, isAdmin, viewMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'admin' && isAdmin) setViewMode('admin');
  }, [isAdmin]);

  const handleStepTransition = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());

  if (loading) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-zinc-900 font-sans selection:bg-[#004aad] selection:text-white relative overflow-x-hidden">
      <ParticleBackground />
      <Navbar user={user} isAdmin={isAdmin} viewMode={viewMode} setViewMode={setViewMode} handleLogin={handleLogin} reset={() => handleStepTransition(1)} />
      
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-32 relative z-10">
        {isSubmitSuccess ? (
          <SuccessView formData={formData} selectedDate={selectedDate} onReturn={() => handleStepTransition(1)} />
        ) : viewMode === 'admin' ? (
          <AdminDashboard applications={applications} db={db} appId={appId} reservations={reservations} />
        ) : (
          <div className="transition-all duration-700">
            {currentStep === 1 && <LandingPage onStart={() => handleStepTransition(2)} />}
            {currentStep === 2 && <PartnerSelectStep onSelect={(type) => { setPartnerType(type); handleStepTransition(3); }} onBack={() => handleStepTransition(1)} />}
            {currentStep === 3 && (
              <CalendarStep 
                reservations={reservations} 
                onSelect={(date) => setSelectedDate(date)} 
                onConfirm={() => {
                   if (!user || user.isAnonymous) {
                     alert("전시 신청을 위해 구글 로그인이 필요합니다.");
                     return handleLogin();
                   }
                   handleStepTransition(4);
                }}
                selectedDate={selectedDate}
                onBack={() => handleStepTransition(2)} 
              />
            )}
            {currentStep === 4 && (
              <ProposalFormStep 
                selectedDate={selectedDate} partnerType={partnerType} formData={formData} setFormData={setFormData}
                onBack={() => handleStepTransition(3)} 
                onSubmitSuccess={() => setIsSubmitSuccess(true)}
                db={db} appId={appId} user={user} reservations={reservations} handleLogin={handleLogin}
              />
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

// --- SUB-COMPONENTS ---

const Navbar = ({ user, isAdmin, viewMode, setViewMode, handleLogin, reset }) => (
  <nav className="fixed top-0 w-full z-[100] px-8 py-6 flex justify-between items-center bg-white/50 backdrop-blur-xl border-b border-gray-100">
    <div className="text-2xl font-black tracking-tighter cursor-pointer" onClick={reset}>UNFRAME</div>
    <div className="flex gap-4">
      {isAdmin && (
        <button onClick={() => setViewMode(viewMode === 'user' ? 'admin' : 'user')} className="text-[9px] font-black uppercase tracking-widest bg-black text-white px-4 py-2 rounded-full hover:bg-[#004aad] transition-all">
          {viewMode === 'user' ? "Admin Console" : "User View"}
        </button>
      )}
      {!user || user.isAnonymous ? (
        <button onClick={handleLogin} className="text-[10px] font-black uppercase tracking-widest border border-zinc-200 px-5 py-2.5 rounded-full hover:bg-black hover:text-white transition-all">Login</button>
      ) : <span className="text-[10px] font-bold text-zinc-400 self-center uppercase tracking-widest">{user.displayName}</span>}
    </div>
  </nav>
);

const LandingPage = ({ onStart }) => (
  <div className="animate-in fade-in duration-1000 space-y-60">
    <header className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      <span className="text-[#004aad] uppercase tracking-[0.5em] text-xs font-black mb-8 block animate-bounce">Collaboration & Rental</span>
      <h1 className="text-6xl md:text-[11rem] font-black uppercase leading-[0.85] mb-12 tracking-tighter text-zinc-900">Start Your<br />Resonance</h1>
      <p className="max-w-2xl mx-auto text-xl text-zinc-400 font-light italic font-serif leading-relaxed px-4">"작가의 철학과 공간의 조화, 새로운 감각이 연결되는 순간."</p>
    </header>

    <section className="py-20 border-t border-gray-100">
      <div className="mb-24 text-center md:text-left"><h3 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none text-zinc-900">🤝 UNFRAME Offers</h3></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <SupportCard icon={<Megaphone size={48} />} title="홍보 및 큐레이션 지원" desc="SNS 공식 채널 포스팅 및 현수막/엽서 제작을 지원하며, 작품 세계관을 심도 있게 전달하는 Curatorial Note를 작성해 드립니다." />
        <SupportCard icon={<Cpu size={48} />} title="장비 대여 및 설치 지원" desc="최적의 관람 환경을 위한 레일 스포트라이트 조명, 미디어용 프로젝터 및 사운드 시스템 등 전시 장비를 무상 제공합니다." />
      </div>
    </section>

    <section className="bg-zinc-900 text-white py-48 px-8 md:px-20 rounded-[80px] shadow-2xl">
      <div className="mb-32 text-center"><h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none text-white">🧳 Preparation</h2></div>
      <div className="grid md:grid-cols-3 gap-20 max-w-6xl mx-auto text-zinc-300">
        <PreparationItem icon={<Truck size={40} className="text-[#004aad]" />} title="운송 및 철수" desc="작품의 포장, 운송 및 설치/철수 작업은 작가님 주관으로 진행됩니다. 전시 후에는 공간 원상복구를 부탁드립니다." />
        <PreparationItem icon={<FileText size={40} className="text-[#004aad]" />} title="전시 정보 전달" desc="홍보물 제작을 위해 고화질 작품 사진, 작가 노트 및 캡션 리스트를 사전에 전달해 주세요." />
        <PreparationItem icon={<ShieldCheck size={40} className="text-[#004aad]" />} title="작품 관리" desc="보험 가입은 선택 사항이며, 갤러리는 고의나 중과실이 없는 한 작품 파손이나 도난에 대해 책임을 지지 않습니다." />
      </div>
    </section>

    <section className="min-h-[70vh] flex flex-col justify-center pb-40 text-zinc-900">
      <div className="grid lg:grid-cols-2 gap-32 items-center">
        <div><h2 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-12 uppercase">정직한 약속</h2><p className="text-xl text-zinc-500 font-light leading-relaxed italic">언프레임은 공간이 작가의 언어를 온전히 담아낼 때 그 가치가 완성된다고 믿습니다.</p></div>
        <div className="bg-white border border-gray-100 p-10 md:p-16 shadow-2xl rounded-[64px]">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-300 mb-10 block">Rental Investment</span>
          <div className="flex flex-wrap items-baseline gap-4 mb-16"><span className="text-4xl md:text-7xl font-black tracking-tighter">2,800,000</span><span className="text-xl text-zinc-400 font-bold uppercase whitespace-nowrap">KRW / WEEK</span></div>
          <button onClick={onStart} className="w-full bg-[#004aad] text-white py-8 rounded-full font-black uppercase tracking-[0.4em] text-xl flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl shadow-[#004aad]/20 active:scale-95"><Sparkles size={24} /> UNFRAME 과 함께하기 <ArrowRight size={24} /></button>
        </div>
      </div>
    </section>
  </div>
);

const PartnerSelectStep = ({ onSelect, onBack }) => (
  <section className="animate-in fade-in slide-in-from-bottom-10 duration-700 py-40 max-w-4xl mx-auto min-h-screen text-center">
    <div className="mb-24">
      <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 text-zinc-900 leading-tight text-center break-keep">Define Your Persona</h2>
      <p className="text-zinc-400 text-lg font-light uppercase tracking-widest">당신은 어떤 파트너인가요?</p>
    </div>
    <div className="grid md:grid-cols-2 gap-10">
      <button onClick={() => onSelect('artist')} className="group relative bg-white border border-zinc-100 p-16 rounded-[60px] shadow-2xl hover:border-[#004aad] transition-all hover:-translate-y-4">
        <div className="w-24 h-24 bg-[#004aad]/10 rounded-full flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform"><Palette size={40} className="text-[#004aad]" /></div>
        <h3 className="text-3xl font-black uppercase text-zinc-900 mb-4">Artist</h3>
        <p className="text-zinc-400 text-sm font-light break-keep text-center">개인전 및 그룹전을 준비하는<br/>예술가 파트너</p>
      </button>
      <button onClick={() => onSelect('brand')} className="group relative bg-zinc-900 border border-zinc-800 p-16 rounded-[60px] shadow-2xl hover:bg-zinc-800 transition-all hover:-translate-y-4">
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform"><Building2 size={40} className="text-white" /></div>
        <h3 className="text-3xl font-black uppercase text-white mb-4">Brand / Team</h3>
        <p className="text-zinc-500 text-sm font-light break-keep text-center">기획 전시, 팝업 스토어 및 브랜딩<br/>행사를 준비하는 파트너</p>
      </button>
    </div>
    <button onClick={onBack} className="mt-20 block mx-auto text-zinc-400 font-black uppercase tracking-widest text-xs hover:text-zinc-900 transition-colors">← Back to Main</button>
  </section>
);

const CalendarStep = ({ reservations = {}, onSelect, onConfirm, selectedDate, onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
  const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(), [currentDate]);

  const confirmedRanges = useMemo(() => {
    return Object.entries(reservations)
      .filter(([_, data]) => data.status === 'confirmed')
      .map(([dateStr, data]) => ({ start: dateStr, end: addDays(dateStr, 6), type: data.partnerType || 'artist' }));
  }, [reservations]);

  const getConfirmedInfo = (dateStr) => confirmedRanges.find(range => isDateInRange(dateStr, range.start, range.end));
  const isSelected = (dateStr) => selectedDate && isDateInRange(dateStr, selectedDate, addDays(selectedDate, 6));

  return (
    <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto py-20 min-h-screen text-center">
      <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-10 leading-none text-zinc-900">Schedule</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16 px-4">
        <NoticeItem icon={<Calendar size={14}/>} text="전시는 최대 7일간 진행됩니다." />
        <NoticeItem icon={<Clock size={14}/>} text="수요일 오후 3시 설치 시작" />
        <NoticeItem icon={<Clock size={14}/>} text="수요일 오후 12시 철수 완료" />
        <NoticeItem icon={<ParkingCircle size={14}/>} text="철수/오프닝 VIP 1시간 주차" />
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[50px] shadow-2xl border border-gray-100 max-w-2xl mx-auto mb-12">
        <div className="flex justify-between items-center mb-10 px-4">
          <h3 className="text-xl md:text-2xl font-black uppercase text-zinc-900">{currentDate.getFullYear()}. {(currentDate.getMonth() + 1).toString().padStart(2, '0')}</h3>
          <div className="flex gap-2 text-zinc-900">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100"><ChevronLeft size={18}/></button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100"><ChevronRight size={18}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-zinc-300 font-black uppercase text-[10px] mb-4">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => <div key={d} className={i===0?'text-red-400':''}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isThu = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay() === 4;
            const isSun = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay() === 0;
            
            const confirmed = getConfirmedInfo(dateStr);
            const active = isSelected(dateStr);
            const resData = reservations[dateStr];
            
            let style = "border-zinc-50 text-zinc-800 font-bold";
            if (confirmed) {
              style = confirmed.type === 'brand' ? "bg-[#ff7700]/10 text-[#ff7700] border-[#ff7700]/20 cursor-not-allowed" : "bg-[#004aad]/10 text-[#004aad] border-[#004aad]/20 cursor-not-allowed";
            } else if (active) {
              style = "bg-[#004aad] text-white border-transparent scale-105 z-10 shadow-lg ring-4 ring-[#004aad]/10";
            } else if (!isThu) {
              style = "text-zinc-200 cursor-default opacity-40 border-transparent";
            } else {
              style = "border-zinc-100 hover:border-[#004aad] hover:scale-105 shadow-sm";
            }

            return (
              <button 
                key={day} 
                disabled={!isThu || !!confirmed}
                onClick={() => onSelect(dateStr)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all border text-sm md:text-base relative ${style}`}
              >
                <span className={isSun && !active ? 'text-red-500' : ''}>{day}</span>
                {isThu && !confirmed && !active && resData?.applicantCount > 0 && (
                   <span className="absolute bottom-1 px-1 bg-[#004aad] text-white text-[6px] rounded-md font-black">심사중 {resData.applicantCount}</span>
                )}
                {isThu && !confirmed && !active && resData?.writingCount > 0 && (
                   <span className="absolute -top-1 -right-1 bg-orange-400 text-white text-[6px] px-1 rounded-full animate-pulse flex items-center gap-0.5"><Edit3 size={6}/> {resData.writingCount}명 작성중</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="animate-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto">
          <div className="mb-10 inline-flex items-center gap-4 bg-zinc-900 text-white px-8 py-4 rounded-3xl shadow-xl">
             <span className="font-black uppercase tracking-widest text-xs">{selectedDate} ~ {addDays(selectedDate, 6)}</span>
             <div className="w-1 h-1 bg-zinc-500 rounded-full"/>
             <span className="text-[10px] font-medium text-zinc-400">7 Days Block Selected</span>
          </div>
          <button onClick={onConfirm} className="w-full bg-[#004aad] text-white py-8 rounded-full font-black uppercase tracking-[0.4em] text-xl flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl shadow-[#004aad]/20">이 기간 신청하기 <ArrowRight size={24} /></button>
        </div>
      )}

      <button onClick={onBack} className="mt-20 block mx-auto text-zinc-400 font-black uppercase tracking-widest text-xs hover:text-zinc-900 transition-colors">← Back</button>
    </section>
  );
};

const NoticeItem = ({ icon, text }) => (
  <div className="flex items-start gap-3 bg-white/70 p-4 rounded-2xl shadow-sm border border-zinc-100 text-left backdrop-blur-sm">
    <div className="text-[#004aad] mt-0.5">{icon}</div>
    <span className="text-[10px] md:text-[11px] font-bold text-zinc-600 leading-tight break-keep">{text}</span>
  </div>
);

const ProposalFormStep = ({ selectedDate, partnerType, formData, setFormData, onBack, onSubmitSuccess, db, appId, user, reservations, handleLogin }) => {
  const [isUploading, setIsUploading] = useState(null);
  const fileInputRefs = { profile: useRef(), highRes: useRef(), workList: useRef(), portfolio: useRef() };

  // 실시간 작성자 수 추적 (로직 보강: setDoc으로 문서 부재 시 대응)
  useEffect(() => {
    if (!selectedDate || !user) return;
    const resDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservations', selectedDate);
    
    const trackWriting = async () => {
      try {
        await updateDoc(resDocRef, { writingCount: increment(1) });
      } catch (e) {
        await setDoc(resDocRef, { writingCount: 1, status: 'writing', updatedAt: serverTimestamp() }, { merge: true });
      }
    };
    trackWriting();

    return () => {
      updateDoc(resDocRef, { writingCount: increment(-1) }).catch(() => {});
    };
  }, [selectedDate, user]);

  const handleUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file || !CLOUDINARY_NAME) return;
    setIsUploading(fieldName);
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', CLOUDINARY_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/upload`, { method: 'POST', body: data });
      const result = await res.json();
      if (result.secure_url) setFormData(prev => ({ ...prev, [fieldName]: result.secure_url }));
    } catch (e) { alert("Upload error"); } finally { setIsUploading(null); }
  };

  const handleSubmit = async () => {
    if (!user || user.isAnonymous) return handleLogin();
    if (!formData.privacyAgreed) return alert("개인정보 동의가 필요합니다.");
    try {
      const resDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservations', selectedDate);
      
      // Submission error 방지: updateDoc 대신 setDoc(merge) 사용
      await setDoc(resDocRef, { 
        status: 'review', 
        applicantCount: increment(1), 
        updatedAt: serverTimestamp(), 
        partnerType 
      }, { merge: true });

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'applications'), {
        userId: user.uid, status: 'review', selectedDate, partnerType, ...formData, submittedAt: serverTimestamp()
      });
      onSubmitSuccess();
    } catch (e) { 
      console.error(e);
      alert("Submission error occurred. Please try again."); 
    }
  };

  return (
    <section className="max-w-4xl mx-auto animate-in fade-in py-10 min-h-screen relative z-10 text-zinc-900">
      <div className="flex justify-between items-center mb-16">
        <button onClick={onBack} className="text-zinc-400 hover:text-zinc-900 flex items-center text-xs font-black uppercase tracking-widest gap-2 transition-all hover:-translate-x-1"><ChevronLeft size={16}/> Calendar</button>
        <button onClick={() => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'drafts', 'current'), {formData, selectedDate, lastSaved: serverTimestamp()}).then(() => alert("Saved."))} className="flex items-center gap-2 bg-zinc-50 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-white border border-transparent hover:border-gray-100 transition-all shadow-sm"><Save size={16}/> Save Draft</button>
      </div>
      <div className="bg-white/80 backdrop-blur-xl border border-gray-100 p-8 md:p-20 rounded-[60px] md:rounded-[80px] shadow-2xl space-y-16">
        <input type="file" ref={fileInputRefs.profile} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'profilePhotoUrl')} />
        <input type="file" ref={fileInputRefs.highRes} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'highResPhotosUrl')} />
        <input type="file" ref={fileInputRefs.workList} className="hidden" accept=".pdf,.doc,.docx,.zip" onChange={(e) => handleUpload(e, 'workListUrl')} />
        <input type="file" ref={fileInputRefs.portfolio} className="hidden" accept=".pdf,.doc,.docx,.zip,.jpg,.png" onChange={(e) => handleUpload(e, 'portfolioUrl')} />
        
        <div className="grid md:grid-cols-2 gap-12">
          <InputBlock label="이름 / 담당자명" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <InputBlock label="생년월일" placeholder="YYYYMMDD" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
        </div>
        <InputBlock label="연락처" placeholder="010-0000-0000" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        <div className="space-y-6">
          <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest">주소 *</label>
          <input className="w-full bg-zinc-50/50 border border-gray-100 p-6 rounded-2xl text-base outline-none focus:bg-white shadow-sm" placeholder="기본 주소" value={formData.addressMain} onChange={e => setFormData({...formData, addressMain: e.target.value})} />
          <input className="w-full bg-zinc-50/50 border border-gray-100 p-6 rounded-2xl text-base outline-none focus:bg-white shadow-sm" placeholder="상세 주소" value={formData.addressDetail} onChange={e => setFormData({...formData, addressDetail: e.target.value})} />
        </div>
        <div className="grid md:grid-cols-2 gap-12 border-t border-gray-50 pt-16">
          <button onClick={() => fileInputRefs.profile.current.click()} className="aspect-square bg-zinc-50 border border-dashed border-zinc-200 rounded-[48px] flex flex-col items-center justify-center gap-2 hover:bg-white transition-all overflow-hidden relative group shadow-inner">
            {formData.profilePhotoUrl ? <img src={formData.profilePhotoUrl} className="absolute inset-0 w-full h-full object-cover" /> : null}
            {isUploading === 'profilePhotoUrl' ? <Loader2 className="animate-spin text-[#004aad]" /> : <div className="z-10 bg-white/80 p-5 rounded-full shadow-xl transition-transform group-hover:scale-110"><Upload size={24} className="text-[#004aad]" /></div>}
          </button>
          <div className="space-y-12">
            <InputBlock label="SNS / Website" placeholder="@instagram" value={formData.snsLink} onChange={e => setFormData({...formData, snsLink: e.target.value})} />
            <InputBlock label="전시명 / 프로젝트명" required value={formData.exhibitionTitle} onChange={e => setFormData({...formData, exhibitionTitle: e.target.value})} />
          </div>
        </div>
        <div className="space-y-6 pt-10 border-t border-gray-50">
          <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest leading-relaxed text-center md:text-left">작가 노트 및 프로젝트 개요 *</label>
          <textarea className="w-full bg-zinc-50/50 border border-gray-100 p-6 md:p-10 rounded-[40px] h-80 text-base outline-none focus:bg-white shadow-sm resize-none font-medium" value={formData.artistNote} onChange={e => setFormData({...formData, artistNote: e.target.value})} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FileBtn label="Portfolio" hasFile={!!formData.portfolioUrl} onClick={() => fileInputRefs.portfolio.current.click()} loading={isUploading === 'portfolioUrl'} />
            <FileBtn label="Work List" hasFile={!!formData.workListUrl} onClick={() => fileInputRefs.workList.current.click()} loading={isUploading === 'workListUrl'} />
            <FileBtn label="High-Res" hasFile={!!formData.highResPhotosUrl} onClick={() => fileInputRefs.highRes.current.click()} loading={isUploading === 'highResPhotosUrl'} isPrimary />
        </div>
        <div className="pt-20 flex flex-col items-center">
          <label className="flex items-center gap-6 cursor-pointer mb-16 group">
            <input type="checkbox" checked={formData.privacyAgreed} onChange={e => setFormData({...formData, privacyAgreed: e.target.checked})} className="w-8 h-8 accent-[#004aad] rounded border-zinc-200" />
            <span className="text-sm md:text-lg font-black text-zinc-400 group-hover:text-zinc-900 transition-colors uppercase">개인정보 동의</span>
          </label>
          <button onClick={handleSubmit} className="w-full bg-zinc-900 text-white py-10 rounded-full font-black uppercase tracking-[0.4em] text-xl md:text-2xl shadow-2xl hover:bg-[#004aad] active:scale-95 transition-all">Submit Proposal <ArrowRight size={32}/></button>
        </div>
      </div>
    </section>
  );
};

const AdminDashboard = ({ applications, db, appId, reservations }) => {
  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter(a => a.status === 'review').length,
      confirmed: applications.filter(a => a.status === 'confirmed').length,
    };
  }, [applications]);

  const groupedApps = useMemo(() => {
    const groups = {};
    applications.forEach(app => { if (!groups[app.selectedDate]) groups[app.selectedDate] = []; groups[app.selectedDate].push(app); });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [applications]);

  const handleAction = async (appDoc, date, status) => {
    try {
      if (status === 'confirmed') {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'applications', appDoc.id), { status: 'confirmed' });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reservations', date), { status: 'confirmed', confirmedArtist: appDoc.name, partnerType: appDoc.partnerType });
      } else if (status === 'delete') {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'applications', appDoc.id));
        const resSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reservations', date));
        if (resSnap.exists()) {
           const currentAppCount = resSnap.data().applicantCount || 1;
           await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reservations', date), { 
             status: currentAppCount > 1 ? 'review' : null, 
             confirmedArtist: null, partnerType: null,
             applicantCount: Math.max(0, currentAppCount - 1)
           });
        }
      }
      alert("Status updated successfully.");
    } catch (e) { alert("Error updating status."); }
  };

  return (
    <section className="animate-in fade-in py-20 text-zinc-900 min-h-screen relative z-10">
      <div className="mb-20 space-y-12">
        <h2 className="text-4xl md:text-6xl font-black uppercase leading-none tracking-tighter">Control Center</h2>
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={<Activity size={20}/>} label="Total Proposals" value={stats.total} color="blue" />
          <StatCard icon={<PieChart size={20}/>} label="Pending Review" value={stats.pending} color="orange" />
          <StatCard icon={<CheckCircle size={20}/>} label="Confirmed" value={stats.confirmed} color="green" />
        </div>
      </div>

      <div className="space-y-32">
        {groupedApps.length > 0 ? groupedApps.map(([date, apps]) => (
          <div key={date}>
            <div className="sticky top-24 z-10 bg-[#fdfbf7]/80 backdrop-blur-sm py-6 border-b border-gray-100 flex items-center justify-between mb-10 text-zinc-900">
              <div className="flex items-center gap-4">
                <Calendar size={20} className="text-[#004aad]" />
                <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter">{date}</h3>
              </div>
              <div className="px-5 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">{apps.length} Applicants</div>
            </div>
            <div className="grid gap-12">
              {apps.map(app => (
                <div key={app.id} className={`bg-white p-8 md:p-16 rounded-[40px] border transition-all ${app.status === 'confirmed' ? 'border-green-400 shadow-xl' : 'border-gray-50 shadow-2xl shadow-gray-200/50'}`}>
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
                    <div className="flex-1 space-y-8">
                      <div>
                        <div className={`mb-4 px-3 py-1 inline-block rounded text-[8px] font-black uppercase text-white ${app.status === 'review' ? 'bg-[#004aad]' : app.status === 'confirmed' ? 'bg-green-500' : 'bg-zinc-400'}`}>{app.status}</div>
                        <h4 className="text-2xl md:text-4xl font-black uppercase text-zinc-900 leading-tight">{app.exhibitionTitle || "Untitled Project"}</h4>
                        <p className="text-sm md:text-xl text-zinc-400 font-bold uppercase mt-2">{app.name} / {app.phone} / <span className="text-[#004aad]">{app.partnerType}</span></p>
                      </div>
                      <div className="flex gap-4 flex-wrap">
                        {app.portfolioUrl && <AdminLink href={app.portfolioUrl} icon={<PortfolioIcon size={14}/>} label="Portfolio" />}
                        {app.workListUrl && <AdminLink href={app.workListUrl} icon={<FileText size={14}/>} label="Work List" />}
                        {app.profilePhotoUrl && <AdminLink href={app.profilePhotoUrl} icon={<ImageIcon size={14}/>} label="Profile" />}
                        {app.highResPhotosUrl && <AdminLink href={app.highResPhotosUrl} icon={<Sparkles size={14}/>} label="High-Res" />}
                      </div>
                    </div>
                    <div className="w-full lg:w-[280px] bg-zinc-50 rounded-[40px] p-8 space-y-3 shadow-inner">
                        <button disabled={app.status === 'confirmed'} onClick={() => handleAction(app, date, 'confirmed')} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-[#004aad] shadow-xl disabled:bg-zinc-200">Approve</button>
                        <button onClick={() => handleAction(app, date, 'delete')} className="w-full py-5 border border-red-100 text-red-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"><Trash2 size={14}/> Delete / Cancel</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="py-60 flex flex-col items-center justify-center text-zinc-300 gap-6">
            <div className="p-8 bg-white rounded-full shadow-2xl border border-zinc-50"><Users size={64} strokeWidth={1} /></div>
            <p className="font-black uppercase tracking-[0.3em] text-sm">No new proposals to review</p>
            <p className="text-xs font-medium text-zinc-400">Everything is up to date.</p>
          </div>
        )}
      </div>
    </section>
  );
};

const StatCard = ({ icon, label, value, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600'
  };
  return (
    <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">{label}</p>
        <p className="text-4xl font-black text-zinc-900">{value}</p>
      </div>
      <div className={`p-4 rounded-3xl ${colorMap[color]}`}>{icon}</div>
    </div>
  );
};

const SuccessView = ({ formData, selectedDate, onReturn }) => (
  <section className="max-w-xl mx-auto py-40 text-center animate-in zoom-in-95 duration-700 min-h-screen relative z-10 text-zinc-900">
    <div className="w-24 h-24 bg-[#004aad]/10 text-[#004aad] rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner"><CheckCircle2 size={48} strokeWidth={3} /></div>
    <h2 className="text-4xl font-black uppercase mb-6 text-[#004aad]">Proposal Received</h2>
    <p className="text-zinc-500 font-light leading-relaxed mb-12 break-keep text-base">작가님의 소중한 제안서가 성공적으로 전달되었습니다. <br/>언프레임 큐레이터 팀이 검토 후 48시간 내에 연락드리겠습니다.</p>
    <button onClick={onReturn} className="w-full border border-zinc-200 text-zinc-400 py-5 rounded-full font-black uppercase text-xs transition-all hover:bg-zinc-50 shadow-sm">Return to Home</button>
  </section>
);

const FileBtn = ({ label, hasFile, onClick, loading, isPrimary }) => (
  <button onClick={onClick} disabled={loading} className={`py-8 border rounded-[32px] text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden ${hasFile ? (isPrimary ? 'bg-[#004aad] text-white border-transparent' : 'bg-zinc-900 text-white border-transparent') : 'border-zinc-100 hover:bg-zinc-50 text-zinc-800 shadow-sm'}`}>
    {loading ? <Loader2 className="animate-spin" size={20}/> : (hasFile ? <CheckCircle size={20}/> : <Upload size={20}/>)}
    {hasFile ? label : `Upload ${label}`}
  </button>
);

const AdminLink = ({ href, icon, label }) => (
  <a href={href} target="_blank" className="flex items-center gap-2 px-6 py-3 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all text-zinc-800 shadow-sm">{icon} {label}</a>
);

const SupportCard = ({ icon, title, desc }) => (
  <div className="bg-white/80 p-12 border border-gray-50 shadow-sm rounded-[60px] hover:border-[#004aad] transition-all duration-500 group text-zinc-900 backdrop-blur-sm">
    <div className="mb-12 text-zinc-200 group-hover:text-[#004aad] transition-all transform group-hover:scale-110 duration-700">{icon}</div>
    <h4 className="text-xl md:text-3xl font-black mb-4 uppercase tracking-tighter leading-tight">{title}</h4>
    <p className="text-base md:text-lg text-zinc-400 font-light leading-relaxed break-keep">{desc}</p>
  </div>
);

const PreparationItem = ({ icon, title, desc }) => (
  <div className="space-y-6 md:space-y-10 group text-zinc-400">
    <div className="flex items-center gap-4 md:gap-6 transform group-hover:translate-x-4 transition-all duration-500">
      <div className="p-4 md:p-5 bg-[#004aad]/10 rounded-2xl md:rounded-3xl flex-shrink-0">{icon}</div>
      <h4 className="text-xl md:text-3xl font-black uppercase text-white tracking-tighter leading-tight">{title}</h4>
    </div>
    <p className="text-base md:text-lg font-light leading-relaxed break-keep">{desc}</p>
  </div>
);

const InputBlock = ({ label, placeholder, required, ...props }) => (
  <div className="space-y-4 text-zinc-900">
    <label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#004aad] flex items-center gap-2">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type="text" placeholder={placeholder} className="w-full bg-zinc-50/50 border border-gray-100 p-5 md:p-7 rounded-[24px] focus:outline-none focus:bg-white font-bold text-base md:text-lg shadow-sm" {...props} />
  </div>
);

const Footer = () => (
  <footer className="border-t border-gray-100 py-32 bg-white/50 text-center relative z-10 text-zinc-900">
    <div className="text-[10px] font-black text-zinc-300 uppercase tracking-[1em] mb-4 text-center">Beyond the Frame</div>
    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest text-center">© 2026 UNFRAME SEOUL</p>
  </footer>
);

export default App;