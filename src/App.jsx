import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
  getAuth, signInWithPopup, signInAnonymously, GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  serverTimestamp, updateDoc, addDoc, deleteDoc, increment, runTransaction, query, where 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { 
  User, ArrowRight, CheckCircle2, Sparkles, Globe, ChevronLeft, ChevronRight, 
  Save, Upload, FileText, LayoutDashboard, Users, Loader2, Image as ImageIcon,
  Megaphone, Cpu, Coffee, Truck, ShieldCheck, Briefcase as PortfolioIcon, XCircle, CheckCircle, MessageCircle,
  Building2, Palette, Clock, ParkingCircle, Info as InfoIcon, Calendar, Edit3, Trash2, Activity, BarChart3, Layers, LogOut, Target, Coins,
  AlertCircle, ChevronDown, ChevronUp, ExternalLink, Paperclip
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

// --- HELPERS ---
const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const isDateInRange = (target, start, end) => target >= start && target <= end;

// --- SUB-COMPONENTS ---

const LoadingOverlay = () => (
  <div className="h-screen flex flex-col items-center justify-center font-black text-[#004aad] bg-[#fdfbf7] fixed inset-0 z-[200]">
    <Loader2 className="animate-spin size-12 mb-4" />
    <span className="animate-pulse tracking-[0.5em] uppercase text-xs text-zinc-400">Unframe Resonance</span>
  </div>
);

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

const NoticeItem = ({ icon, text }) => (
  <div className="flex items-start gap-3 bg-white/70 p-4 rounded-2xl shadow-sm border border-zinc-100 text-left backdrop-blur-sm">
    <div className="text-[#004aad] mt-0.5">{icon}</div>
    <span className="text-[10px] md:text-[11px] font-bold text-zinc-600 leading-tight break-keep">{text}</span>
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
    name: '', realName: '', stageName: '', englishName: '',
    birthDate: '', phone: '', addressMain: '', addressDetail: '',
    profilePhotoUrl: '', snsLink: '', portfolioUrl: '', exhibitionTitle: '',
    artistNote: '', workListUrl: '', highResPhotosUrl: '', experimentText: '',
    brandName: '', brandRole: '', projectPurpose: '', targetAudience: '', budgetRange: '', 
    privacyAgreed: false
  });

  const myApplications = useMemo(() => {
    if (!user || user.isAnonymous) return [];
    return applications.filter(app => app.userId === user.uid);
  }, [applications, user]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
      } else {
        setUser(u);
        setIsAdmin(ADMIN_EMAILS.includes(u.email));
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

    const appRef = collection(db, 'artifacts', appId, 'public', 'data', 'applications');
    const appQuery = (isAdmin && viewMode === 'admin')
      ? appRef 
      : query(appRef, where("userId", "==", user.uid));

    const unsubscribeApp = onSnapshot(appQuery, (snap) => {
      const appList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setApplications(appList);
    }, (err) => {
      console.warn("Application access limited by security rules");
    });

    return () => { unsubscribeRes(); unsubscribeApp(); };
  }, [user, isAdmin, viewMode]);

  const handleStepTransition = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  const handleSignOut = () => signOut(auth).then(() => window.location.reload());

  if (loading) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-zinc-900 font-sans selection:bg-[#004aad] selection:text-white relative overflow-x-hidden">
      <ParticleBackground />
      <Navbar 
        user={user} isAdmin={isAdmin} viewMode={viewMode} 
        setViewMode={(v) => { setViewMode(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
        handleLogin={handleLogin} handleSignOut={handleSignOut}
        reset={() => { setCurrentStep(1); setIsSubmitSuccess(false); setSelectedDate(null); setViewMode('user'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
      />
      
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-32 relative z-10 text-left">
        {isSubmitSuccess ? (
          <SuccessView formData={formData} selectedDate={selectedDate} onReturn={() => {
            setIsSubmitSuccess(false);
            handleStepTransition(1);
          }} />
        ) : viewMode === 'admin' ? (
          <AdminDashboard applications={applications} db={db} appId={appId} reservations={reservations} />
        ) : viewMode === 'my-page' ? (
          <MyPage applications={myApplications} handleReturn={() => setViewMode('user')} />
        ) : (
          <div className="transition-all duration-700">
            {currentStep === 1 && <LandingPage onStart={() => handleStepTransition(2)} />}
            {currentStep === 2 && <PartnerSelectStep onSelect={(type) => { setPartnerType(type); handleStepTransition(3); }} onBack={() => handleStepTransition(1)} />}
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
                selectedDate={selectedDate} partnerType={partnerType} formData={formData} setFormData={setFormData}
                onBack={() => handleStepTransition(3)} 
                onSubmitSuccess={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' }); 
                  setIsSubmitSuccess(true);
                }}
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

const Navbar = ({ user, isAdmin, viewMode, setViewMode, handleLogin, handleSignOut, reset }) => (
  <nav className="fixed top-0 w-full z-[100] px-8 py-6 flex justify-between items-center bg-white/50 backdrop-blur-xl border-b border-gray-100">
    <div className="text-2xl font-black tracking-tighter cursor-pointer" onClick={reset}>UNFRAME</div>
    <div className="flex gap-3 md:gap-4">
      {isAdmin && (
        <button onClick={() => setViewMode(viewMode === 'admin' ? 'user' : 'admin')} className="text-[9px] font-black uppercase tracking-widest bg-black text-white px-4 py-2 rounded-full hover:bg-[#004aad] transition-all shadow-lg">
          {viewMode === 'admin' ? "Exit Admin" : "Admin Console"}
        </button>
      )}
      {user && !user.isAnonymous && (
        <button onClick={() => setViewMode('my-page')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${viewMode === 'my-page' ? 'bg-[#004aad] text-white shadow-lg' : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
          My Page
        </button>
      )}
      {!user || user.isAnonymous ? (
        <button onClick={handleLogin} className="text-[10px] font-black uppercase tracking-widest border border-zinc-200 px-5 py-2.5 rounded-full hover:bg-black hover:text-white transition-all text-center">Login</button>
      ) : (
        <div className="flex items-center gap-4 border-l pl-4 border-zinc-100">
          <span className="hidden md:inline text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{user.displayName}</span>
          <button onClick={handleSignOut} className="text-[#004aad] transition-colors hover:text-red-500"><LogOut size={16}/></button>
        </div>
      )}
    </div>
  </nav>
);

const LandingPage = ({ onStart }) => (
  <div className="animate-in fade-in duration-1000 space-y-60 px-4">
    <header className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      <span className="text-[#004aad] uppercase tracking-[0.5em] text-xs font-black mb-8 block animate-bounce">Collaboration & Rental</span>
      <h1 className="text-6xl md:text-[11rem] font-black uppercase leading-[0.85] mb-12 tracking-tighter text-zinc-900 leading-none">Start Your<br />Resonance</h1>
      <p className="max-w-2xl mx-auto text-xl text-zinc-400 font-light italic font-serif leading-relaxed px-4 text-center">"작가의 철학과 공간의 조화, 새로운 감각이 연결되는 순간."</p>
    </header>

    <section className="py-20 border-t border-gray-100">
      <div className="mb-24 text-center md:text-left"><h3 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none text-zinc-900 text-center">🤝 UNFRAME 지원사항</h3></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
        <SupportCard icon={<Megaphone size={48} />} title="홍보 및 큐레이션 지원" desc="SNS 공식 채널 포스팅 및 현수막/엽서 제작을 지원하며, 작품 세계관을 심도 있게 전달하는 Curatorial Note를 작성해 드립니다." />
        <SupportCard icon={<Cpu size={48} />} title="장비 대여 및 설치 지원" desc="최적의 관람 환경을 위한 레일 스포트라이트 조명, 미디어용 프로젝터 및 사운드 시스템 등 전시 장비를 무상 제공합니다." />
        <SupportCard icon={<User size={48} />} title="전시 운영 인력 상주" desc="전시 기간 중 전문 디렉터가 상주하여 관람객 응대, 작품 보호 및 콜렉터 구매 문의를 직접 책임지고 관리합니다." />
        <SupportCard icon={<Coffee size={48} />} title="행사 및 편의 지원" desc="오프닝 리셉션 다과 세팅을 지원하며, 작가님과 귀빈분들을 위한 무료 주차(1시간) 및 케이터링 편의를 제공합니다." />
      </div>
    </section>

    <section className="bg-zinc-900 text-white py-48 px-8 md:px-20 rounded-[80px] relative overflow-hidden shadow-2xl">
      <div className="mb-32 text-center"><h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none text-white text-center">🧳 Preparation</h2></div>
      <div className="grid md:grid-cols-3 gap-20 max-w-6xl mx-auto text-zinc-300 text-left">
        <PreparationItem icon={<Truck size={40} className="text-[#004aad]" />} title="운송 및 철수" desc="작품의 포장, 운송 및 설치/철수 작업은 작가님 주관으로 진행됩니다. 전시 후에는 공간 원상복구를 부탁드립니다." />
        <PreparationItem icon={<FileText size={40} className="text-[#004aad]" />} title="전시 정보 전달" desc="홍보물 제작을 위해 고화질 작품 사진, 작가 노트 및 캡션 리스트를 사전에 전달해 주세요." />
        <PreparationItem icon={<ShieldCheck size={40} className="text-[#004aad]" />} title="작품 관리" desc="보험 가입은 선택 사항이며, 갤러리는 고의나 중과실이 없는 한 작품 파손이나 도난에 대해 책임을 지지 않습니다." />
      </div>
    </section>

    <section className="min-h-[70vh] flex flex-col justify-center pb-40 text-zinc-900">
      <div className="grid lg:grid-cols-2 gap-32 items-center text-left">
        <div><h2 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-12 uppercase text-zinc-900">정직한 약속</h2><p className="text-xl text-zinc-500 font-light leading-relaxed italic text-left">언프레임은 공간이 작가의 언어를 온전히 담아낼 때 그 가치가 완성된다고 믿습니다.</p></div>
        <div className="bg-white border border-gray-100 p-10 md:p-16 shadow-2xl rounded-[64px]">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-300 mb-10 block text-zinc-400 text-left">Rental Investment</span>
          <div className="flex flex-wrap items-baseline gap-4 mb-16"><span className="text-4xl md:text-7xl font-black tracking-tighter text-zinc-900">2,800,000</span><span className="text-xl text-zinc-400 font-bold uppercase whitespace-nowrap">KRW / WEEK</span></div>
          <button onClick={onStart} className="w-full bg-[#004aad] text-white py-8 rounded-full font-black uppercase tracking-[0.4em] text-xl flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl shadow-[#004aad]/20 active:scale-95 transition-all text-center">
            <Sparkles size={24} /> UNFRAME 과 함께하기 <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </section>
  </div>
);

const PartnerSelectStep = ({ onSelect, onBack }) => (
  <section className="animate-in fade-in slide-in-from-bottom-10 duration-700 py-40 max-w-4xl mx-auto min-h-screen text-center px-4">
    <div className="mb-24 text-center">
      <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6 text-zinc-900 leading-tight break-keep">Define Your Creative Persona</h2>
      <p className="text-zinc-400 text-lg font-light uppercase tracking-widest">당신은 어떤 파트너인가요?</p>
    </div>
    <div className="grid md:grid-cols-2 gap-10 text-center">
      <button onClick={() => onSelect('artist')} className="group relative bg-white border border-zinc-100 p-16 rounded-[60px] shadow-2xl hover:border-[#004aad] transition-all hover:-translate-y-4 text-center">
        <div className="w-24 h-24 bg-[#004aad]/10 rounded-full flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform text-center"><Palette size={40} className="text-[#004aad]" /></div>
        <h3 className="text-3xl font-black uppercase text-zinc-900 mb-4 text-center">Artist</h3>
        <p className="text-zinc-400 text-sm font-light break-keep text-center">개인전 및 그룹전을 준비하는<br/>예술가 파트너</p>
      </button>
      <button onClick={() => onSelect('brand')} className="group relative bg-zinc-900 border border-zinc-800 p-16 rounded-[60px] shadow-2xl hover:bg-zinc-800 transition-all hover:-translate-y-4 text-center">
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform text-center"><Building2 size={40} className="text-white" /></div>
        <h3 className="text-3xl font-black uppercase text-white mb-4 text-center">Brand / Team</h3>
        <p className="text-zinc-500 text-sm font-light break-keep text-center">기획 전시, 팝업 스토어 및 브랜딩<br/>행사를 준비하는 파트너</p>
      </button>
    </div>
    <button onClick={onBack} className="mt-20 block mx-auto text-zinc-400 font-black uppercase tracking-widest text-xs hover:text-zinc-900 transition-colors">← Back to Main</button>
  </section>
);

const CalendarStep = ({ reservations = {}, onSelect, onConfirm, selectedDate, onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
  
  // 일요일 시작 레이아웃 (0: Sun, 1: Mon, ..., 6: Sat)
  const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(), [currentDate]);

  const confirmedRanges = useMemo(() => {
    return Object.entries(reservations)
      .filter(([_, data]) => data.status === 'confirmed')
      .map(([dateStr, data]) => ({ 
        start: dateStr, end: addDays(dateStr, 6), 
        type: data.partnerType || 'artist',
        title: data.confirmedTitle || "예약된 전시",
        artist: data.confirmedArtist || "비공개 작가"
      }));
  }, [reservations]);

  const getConfirmedInfo = (dateStr) => confirmedRanges.find(range => isDateInRange(dateStr, range.start, range.end));
  const isSelected = (dateStr) => selectedDate && isDateInRange(dateStr, selectedDate, addDays(selectedDate, 6));

  return (
    <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto py-20 min-h-screen text-center px-4">
      <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-10 leading-none text-zinc-900 text-center">Schedule</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16 px-4">
        <NoticeItem icon={<Calendar size={14}/>} text="전시는 최대 7일간 진행됩니다." />
        <NoticeItem icon={<Clock size={14}/>} text="수요일 오후 3시 설치 시작" />
        <NoticeItem icon={<Clock size={14}/>} text="수요일 오후 12시 철수 완료" />
        <NoticeItem icon={<ParkingCircle size={14}/>} text="철수/오프닝 VIP 1시간 주차" />
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[50px] shadow-2xl border border-gray-100 max-w-2xl mx-auto mb-12">
        <div className="flex justify-between items-center mb-10 px-4 text-zinc-900">
          <h3 className="text-xl md:text-2xl font-black uppercase text-left">{currentDate.getFullYear()}. {(currentDate.getMonth() + 1).toString().padStart(2, '0')}</h3>
          <div className="flex gap-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 transition-colors"><ChevronLeft size={18}/></button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 transition-colors"><ChevronRight size={18}/></button>
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
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isThu = dateObj.getDay() === 4;
            const isSun = dateObj.getDay() === 0;
            const confirmed = getConfirmedInfo(dateStr);
            const active = isSelected(dateStr);
            const resData = reservations[dateStr];
            
            let style = "border-zinc-50 text-zinc-800 font-bold";
            if (confirmed) style = confirmed.type === 'brand' ? "bg-[#ff7700]/10 text-[#ff7700] border-[#ff7700]/20 cursor-help" : "bg-[#004aad]/10 text-[#004aad] border-[#004aad]/20 cursor-help";
            else if (active) style = "bg-[#004aad] text-white border-transparent scale-105 z-10 shadow-lg ring-4 ring-[#004aad]/10";
            else if (!isThu) style = "text-zinc-200 cursor-default opacity-40 border-transparent";
            else style = "border-zinc-100 hover:border-[#004aad] hover:scale-105 shadow-sm";

            return (
              <div key={day} className="relative group aspect-square">
                <button disabled={!isThu || !!confirmed} onClick={() => onSelect(dateStr)} className={`w-full h-full rounded-xl flex flex-col items-center justify-center transition-all border text-sm md:text-base relative ${style}`}>
                  <span className={isSun && !active ? 'text-red-500' : ''}>{day}</span>
                  {isThu && !confirmed && !active && resData?.applicantCount > 0 && <span className="absolute bottom-1 px-1.5 bg-[#004aad] text-white text-[7px] rounded-md font-black shadow-sm">심사중 {resData.applicantCount}</span>}
                  {isThu && !confirmed && !active && resData?.writingCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[7px] px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-0.5 whitespace-nowrap z-20 font-black shadow-sm"><Edit3 size={7}/> 작성중 {resData.writingCount}</span>}
                </button>
                {confirmed && (
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-left">
                      <p className="text-[8px] font-black uppercase text-[#004aad] mb-1 text-left">{confirmed.type}</p>
                      <h4 className="text-xs font-black leading-tight mb-2 break-keep text-left">{confirmed.title}</h4>
                      <p className="text-[10px] text-zinc-400 font-medium text-left">Artist: {confirmed.artist}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                   </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="animate-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto">
          <div className="mb-10 inline-flex items-center gap-4 bg-zinc-900 text-white px-8 py-4 rounded-3xl shadow-xl">
             <span className="font-black uppercase tracking-widest text-xs">{selectedDate} ~ {addDays(selectedDate, 6)}</span>
             <div className="w-1 h-1 bg-zinc-500 rounded-full"/><span className="text-[10px] font-medium text-zinc-400 uppercase tracking-tighter text-center">7 Days Selection</span>
          </div>
          <button onClick={onConfirm} className="w-full bg-[#004aad] text-white py-8 rounded-full font-black uppercase tracking-[0.4em] text-xl flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl shadow-[#004aad]/20 active:scale-95 text-center">이 기간 신청하기 <ArrowRight size={24} /></button>
        </div>
      )}
      <button onClick={onBack} className="mt-20 block mx-auto text-zinc-400 font-black uppercase tracking-widest text-xs hover:text-[#004aad] transition-all text-center">← Back</button>
    </section>
  );
};

const ProposalFormStep = ({ selectedDate, partnerType, formData, setFormData, onBack, onSubmitSuccess, db, appId, user, handleLogin }) => {
  const [isUploading, setIsUploading] = useState(null);
  const fileInputRefs = { profile: useRef(), highRes: useRef(), workList: useRef(), portfolio: useRef() };
  const isBrand = partnerType === 'brand';

  useEffect(() => {
    if (!selectedDate || !user || user.isAnonymous) return;
    const resDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservations', selectedDate);
    const trackWriting = async () => {
      try { await updateDoc(resDocRef, { writingCount: increment(1) }); } 
      catch (e) { await setDoc(resDocRef, { writingCount: 1, status: 'writing', updatedAt: serverTimestamp() }, { merge: true }); }
    };
    trackWriting();
    return () => { updateDoc(resDocRef, { writingCount: increment(-1) }).catch(() => {}); };
  }, [selectedDate, user]);

  const handleUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file || !CLOUDINARY_NAME) return;

    setIsUploading(fieldName);

    // ✅ 이미지면 image, 그 외(pdf/doc/zip)는 raw로 분기 처리
    const isImage = file.type.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', CLOUDINARY_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/${resourceType}/upload`, { 
        method: 'POST', 
        body: data 
      });
      const result = await res.json();

      if (result.error) {
        console.error("Cloudinary error:", result.error);
        alert(`Upload Failed: ${result.error.message}`);
        return;
      }

      if (result.secure_url) {
        setFormData(prev => ({ ...prev, [fieldName]: result.secure_url }));
      }
    } catch(err) { 
      console.error(err);
      alert("Upload Failed."); 
    } finally { 
      setIsUploading(null); 
    }
  };

  const handleSubmit = async () => {
    if (!user || user.isAnonymous) { alert("로그인이 필요합니다."); handleLogin(); return; }
    if (!formData.privacyAgreed) return alert("개인정보 동의가 필요합니다.");
    try {
      const resDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservations', selectedDate);
      await runTransaction(db, async (transaction) => {
        const resSnap = await transaction.get(resDocRef);
        const currentCount = resSnap.exists() ? (resSnap.data().applicantCount || 0) : 0;
        transaction.set(resDocRef, { status: 'review', applicantCount: currentCount + 1, updatedAt: serverTimestamp(), partnerType }, { merge: true });
      });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'applications'), {
        userId: user.uid, status: 'review', selectedDate, partnerType, ...formData, submittedAt: serverTimestamp()
      });
      onSubmitSuccess();
    } catch (e) { console.error(e); alert("제출 중 오류가 발생했습니다."); }
  };

  return (
    <section className="max-w-4xl mx-auto animate-in fade-in py-10 min-h-screen relative z-10 text-zinc-900 text-left px-4">
      <div className="flex justify-between items-center mb-16 text-left">
        <button onClick={onBack} className="text-zinc-400 hover:text-black flex items-center text-xs font-black uppercase tracking-widest gap-2 transition-all hover:-translate-x-1 transition-colors text-left"><ChevronLeft size={16}/> Calendar</button>
        <button onClick={() => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'drafts', 'current'), {formData, selectedDate, lastSaved: serverTimestamp()}).then(() => alert("Saved.")) } className="flex items-center gap-2 bg-zinc-50 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-white border border-transparent hover:border-gray-100 transition-all shadow-sm shadow-zinc-100 text-left"><Save size={16}/> Save Draft</button>
      </div>
      <div className="bg-white/80 backdrop-blur-xl border border-gray-100 p-8 md:p-20 rounded-[60px] shadow-2xl space-y-16">
        <input type="file" ref={fileInputRefs.profile} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'profilePhotoUrl')} />
        <input type="file" ref={fileInputRefs.highRes} className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'highResPhotosUrl')} />
        <input type="file" ref={fileInputRefs.workList} className="hidden" onChange={(e) => handleUpload(e, 'workListUrl')} />
        <input type="file" ref={fileInputRefs.portfolio} className="hidden" onChange={(e) => handleUpload(e, 'portfolioUrl')} />
        
        <header className="border-b border-zinc-100 pb-10 text-left">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#004aad] flex items-center gap-3">
             {isBrand ? <Building2 size={32}/> : <Palette size={32}/>}
             {isBrand ? "브랜드 및 기획자 제안 양식" : "아티스트 전시 지원 양식"}
          </h2>
          <p className="text-zinc-400 text-xs mt-2 font-black tracking-widest uppercase">일정: {selectedDate} ~ {addDays(selectedDate, 6)}</p>
        </header>

        {isBrand ? (
          <div className="grid md:grid-cols-2 gap-12 animate-in fade-in text-left">
            <InputBlock label="브랜드명 / 소속" required value={formData.brandName} onChange={e => setFormData({...formData, brandName: e.target.value})} />
            <InputBlock label="담당자 성함" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in text-left">
             <div className="grid md:grid-cols-2 gap-12 text-left">
                <InputBlock label="아티스트 본명" required value={formData.realName} onChange={e => setFormData({...formData, realName: e.target.value, name: e.target.value})} />
                <InputBlock label="활동명 / 예명" placeholder="미입력 시 본명 사용" value={formData.stageName} onChange={e => setFormData({...formData, stageName: e.target.value})} />
             </div>
             <InputBlock label="영문 이름" placeholder="예: Hong Gil Dong" value={formData.englishName} onChange={e => setFormData({...formData, englishName: e.target.value})} />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-12 text-left">
          <InputBlock label="연락처" placeholder="010-0000-0000" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <InputBlock label={isBrand ? "설립일" : "생년월일"} placeholder="YYYYMMDD" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
        </div>

        <div className="space-y-6 text-left">
          <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest text-left">주소 *</label>
          <input className="w-full bg-zinc-50/50 border border-gray-100 p-6 rounded-2xl text-base outline-none focus:bg-white shadow-sm font-bold transition-colors text-left" placeholder="기본 주소" value={formData.addressMain} onChange={e => setFormData({...formData, addressMain: e.target.value})} />
          <input className="w-full bg-zinc-50/50 border border-gray-100 p-6 rounded-2xl text-base outline-none focus:bg-white shadow-sm font-bold transition-colors text-left" placeholder="상세 주소" value={formData.addressDetail} onChange={e => setFormData({...formData, addressDetail: e.target.value})} />
        </div>

        <div className="grid md:grid-cols-2 gap-12 border-t border-gray-50 pt-16 text-left">
          <button onClick={() => fileInputRefs.profile.current.click()} className="aspect-square bg-zinc-50 border border-dashed border-zinc-200 rounded-[48px] flex flex-col items-center justify-center gap-2 hover:bg-white transition-all overflow-hidden relative group shadow-inner">
            {formData.profilePhotoUrl ? <img src={formData.profilePhotoUrl} className="absolute inset-0 w-full h-full object-cover" alt="Profile" /> : null}
            {isUploading === 'profilePhotoUrl' ? <Loader2 className="animate-spin text-[#004aad]" /> : <div className="z-10 bg-white/80 p-5 rounded-full shadow-xl transition-transform group-hover:scale-110"><Upload size={24} className="text-[#004aad]" /></div>}
            <div className="text-[9px] font-black text-zinc-400 mt-2 text-center uppercase">{isBrand ? "BRAND LOGO" : "PROFILE PHOTO"}</div>
          </button>
          <div className="space-y-12 text-zinc-900 text-left">
            <InputBlock label="SNS / Website" placeholder="@instagram / https://" value={formData.snsLink} onChange={e => setFormData({...formData, snsLink: e.target.value})} />
            <InputBlock label={isBrand ? "프로젝트 명" : "전시명 (가제)"} required value={formData.exhibitionTitle} onChange={e => setFormData({...formData, exhibitionTitle: e.target.value})} />
          </div>
        </div>

        <div className="space-y-6 pt-10 border-t border-gray-50 text-left">
          <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest leading-relaxed text-left">{isBrand ? "공간 활용 계획 및 협업 제안서 *" : "작가 노트 및 프로젝트 개요 *"}</label>
          <textarea className="w-full bg-zinc-50/50 border border-gray-100 p-6 md:p-10 rounded-[40px] h-80 text-base outline-none focus:bg-white shadow-sm resize-none font-bold transition-colors text-zinc-900 text-left" value={isBrand ? formData.projectPurpose : formData.artistNote} onChange={e => setFormData({...formData, [isBrand ? 'projectPurpose' : 'artistNote']: e.target.value})} />
        </div>

        {/* ✅ 버튼 3개 복구 (포트폴리오, 작품리스트, 대표작 고화질 이미지) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FileBtn label="포트폴리오" hasFile={!!formData.portfolioUrl} onClick={() => fileInputRefs.portfolio.current.click()} loading={isUploading === 'portfolioUrl'} />
            <FileBtn label="작품리스트" hasFile={!!formData.workListUrl} onClick={() => fileInputRefs.workList.current.click()} loading={isUploading === 'workListUrl'} />
            <FileBtn label="대표작 원본" hasFile={!!formData.highResPhotosUrl} onClick={() => fileInputRefs.highRes.current.click()} loading={isUploading === 'highResPhotosUrl'} isPrimary />
        </div>

        <div className="pt-20 flex flex-col items-center">
          <label className="flex items-center gap-6 cursor-pointer mb-16 group">
            <input type="checkbox" checked={formData.privacyAgreed} onChange={e => setFormData({...formData, privacyAgreed: e.target.checked})} className="w-8 h-8 accent-[#004aad] rounded border-zinc-200" />
            <span className="text-sm md:text-lg font-black text-zinc-400 group-hover:text-zinc-900 transition-colors uppercase tracking-widest text-center">개인정보 수집 및 이용 동의</span>
          </label>
          <button onClick={handleSubmit} className="w-full bg-zinc-900 text-white py-10 rounded-full font-black uppercase tracking-[0.4em] text-xl md:text-2xl shadow-2xl hover:bg-[#004aad] active:scale-95 transition-all transition-colors text-center shadow-black/10">Submit Proposal <ArrowRight size={32}/></button>
        </div>
      </div>
    </section>
  );
};

const AdminDashboard = ({ applications, db, appId, reservations }) => {
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === 'review').length,
    confirmed: applications.filter(a => a.status === 'confirmed').length,
  }), [applications]);

  const groupedApps = useMemo(() => {
    const groups = {};
    applications.forEach(app => { if (!groups[app.selectedDate]) groups[app.selectedDate] = []; groups[app.selectedDate].push(app); });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [applications]);

  const handleAction = async (appDoc, date, status, reason = '') => {
    try {
      if (status === 'confirmed') {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'applications', appDoc.id), { status: 'confirmed' });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reservations', date), { 
           status: 'confirmed', confirmedArtist: appDoc.stageName || appDoc.name, confirmedTitle: appDoc.exhibitionTitle, partnerType: appDoc.partnerType 
        }, { merge: true });
      } else if (status === 'rejected' || status === 'delete') {
        if (status === 'rejected') await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'applications', appDoc.id), { status: 'rejected', rejectionReason: reason });
        else await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'applications', appDoc.id));
        
        const resRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservations', date);
        await runTransaction(db, async (t) => {
          const snap = await t.get(resRef);
          if (snap.exists()) {
            const newCount = Math.max(0, (snap.data().applicantCount || 1) - 1);
            t.update(resRef, { status: newCount > 0 ? 'review' : null, confirmedArtist: null, confirmedTitle: null, partnerType: null, applicantCount: newCount });
          }
        });
      }
      setRejectId(null); setRejectReason('');
      alert("Updated successfully.");
    } catch (e) { alert("Action failed."); }
  };

  return (
    <section className="animate-in fade-in py-20 text-zinc-900 min-h-screen relative z-10 text-left px-4">
      <div className="mb-20 space-y-12 text-left">
        <div className="flex items-center gap-4 text-left"><div className="p-4 bg-[#004aad] rounded-3xl text-white shadow-xl shadow-[#004aad]/20"><Activity size={32}/></div><h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-left">Control Center</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <StatCard icon={<FileText size={20}/>} label="Total Proposals" value={stats.total} color="blue" />
          <StatCard icon={<Users size={20}/>} label="Pending Review" value={stats.pending} color="orange" />
          <CheckCard icon={<CheckCircle size={20}/>} label="Confirmed" value={stats.confirmed} color="green" />
        </div>
      </div>

      <div className="space-y-24 text-left">
        {groupedApps.length > 0 ? groupedApps.map(([date, apps]) => (
          <div key={date}>
            <div className="sticky top-24 z-10 bg-[#fdfbf7]/80 backdrop-blur-sm py-6 border-b border-gray-100 flex items-center justify-between mb-10 text-left">
              <div className="flex items-center gap-4 text-left"><Calendar size={20} className="text-[#004aad]" /><h3 className="text-xl md:text-3xl font-black uppercase text-left">{date}</h3></div>
              <div className="px-5 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm text-center">{apps.length} Applicants</div>
            </div>
            <div className="grid gap-12 text-left">
              {apps.map(app => (
                <div key={app.id} className={`bg-white rounded-[40px] border overflow-hidden transition-all ${app.status === 'confirmed' ? 'border-green-400 shadow-xl shadow-green-100/10' : 'border-gray-50 shadow-2xl shadow-gray-200/50'}`}>
                  <div className="p-8 md:p-12 text-left">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-12 text-left">
                      <div className="flex-1 space-y-6 text-left">
                        <div className={`mb-4 px-3 py-1 inline-block rounded text-[8px] font-black uppercase text-white ${app.status === 'review' ? 'bg-[#004aad]' : app.status === 'confirmed' ? 'bg-green-500' : 'bg-red-400'}`}>{app.status}</div>
                        <h4 className="text-2xl md:text-4xl font-black uppercase leading-tight break-words text-left">{app.exhibitionTitle || "Untitled Project"}</h4>
                        <div className="flex items-center gap-6 text-left">
                           <p className="text-sm font-black text-zinc-400 uppercase">{app.partnerType === 'brand' ? app.brandName : app.stageName || app.name}</p>
                           <div className="w-1 h-1 bg-zinc-200 rounded-full"/>
                           <p className="text-sm font-black text-zinc-400">{app.phone}</p>
                        </div>
                        <div className="flex gap-4 flex-wrap text-left">
                          {app.portfolioUrl && <AdminLink href={app.portfolioUrl} icon={<Paperclip size={14}/>} label="포트폴리오 파일" />}
                          {app.workListUrl && <AdminLink href={app.workListUrl} icon={<FileText size={14}/>} label="작품리스트 파일" />}
                          {app.highResPhotosUrl && <AdminLink href={app.highResPhotosUrl} icon={<ImageIcon size={14}/>} label="대표작 고화질 원본" />}
                        </div>
                      </div>
                      <div className="w-full lg:w-[280px] space-y-3 text-left">
                         <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)} className="w-full py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-zinc-100 transition-all text-center">
                            {expandedId === app.id ? <><ChevronUp size={14}/> 상세내용 닫기</> : <><ChevronDown size={14}/> 신청서 상세 보기</>}
                         </button>
                        {rejectId === app.id ? (
                           <div className="space-y-3 animate-in fade-in zoom-in-95 text-left">
                             <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="사유 입력..." className="w-full bg-zinc-50 p-4 rounded-xl text-xs outline-none h-24 font-bold border border-red-100 text-left transition-all" />
                             <div className="flex gap-2">
                               <button onClick={() => handleAction(app, date, 'rejected', rejectReason)} className="flex-1 py-3 bg-red-400 text-white rounded-xl text-[10px] font-black uppercase transition-all text-center">Confirm</button>
                               <button onClick={() => setRejectId(null)} className="py-3 px-4 bg-zinc-100 rounded-xl text-[10px] font-black uppercase transition-all text-center">Cancel</button>
                             </div>
                           </div>
                        ) : (
                          <div className="flex flex-col gap-3 text-left">
                            <button disabled={app.status === 'confirmed'} onClick={() => handleAction(app, date, 'confirmed')} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-[#004aad] shadow-xl disabled:bg-zinc-100 transition-all text-center">Approve</button>
                            <button disabled={app.status === 'rejected'} onClick={() => setRejectId(app.id)} className="w-full py-5 border border-red-100 text-red-400 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-red-50 transition-all text-center">Reject</button>
                            <button onClick={() => handleAction(app, date, 'delete')} className="text-[9px] font-black uppercase text-zinc-300 hover:text-red-500 py-2 text-center transition-colors">Permanent Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedId === app.id && (
                    <div className="bg-zinc-50 border-t border-gray-100 p-8 md:p-16 animate-in slide-in-from-top-4 duration-500 text-left">
                       <div className="grid md:grid-cols-2 gap-20 text-left">
                          <div className="space-y-12 text-left">
                             <div>
                                <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">User Profile Information</h5>
                                <div className="grid gap-4 text-left">
                                   <DetailItem label="전체 성함" value={app.partnerType === 'brand' ? app.brandName : `${app.realName} (${app.englishName || '-'})`} />
                                   <DetailItem label="활동/예명" value={app.partnerType === 'brand' ? '-' : app.stageName || app.realName} />
                                   <DetailItem label="연락처" value={app.phone} />
                                   <DetailItem label="생년/설립일" value={app.birthDate} />
                                   <DetailItem label="주소" value={`${app.addressMain} ${app.addressDetail}`} />
                                </div>
                             </div>
                             <div>
                                <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">Proposal Note</h5>
                                <p className="text-sm font-bold text-zinc-700 leading-relaxed whitespace-pre-wrap text-left">"{app.partnerType === 'brand' ? app.projectPurpose : app.artistNote}"</p>
                             </div>
                          </div>
                          <div className="space-y-12 text-left">
                             <div>
                                <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">Visual & External Assets</h5>
                                <div className="flex flex-col gap-4 text-left">
                                   <a href={app.snsLink?.startsWith('http') ? app.snsLink : `https://${app.snsLink}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"><Globe size={18}/> 공식 SNS / 웹사이트 링크 바로가기</a>
                                   <a href={app.profilePhotoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"><ImageIcon size={18}/> 프로필 사진 / 로고 원본 크게보기</a>
                                   {app.highResPhotosUrl && <a href={app.highResPhotosUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 text-[#004aad] text-xs font-black hover:bg-[#004aad] hover:text-white transition-all shadow-sm"><ImageIcon size={18}/> 대표작 고화질 이미지 원본 보기</a>}
                                </div>
                             </div>
                             {app.experimentText && (
                               <div>
                                  <h5 className="text-[10px] font-black text-[#004aad] uppercase tracking-[0.2em] mb-6 border-b border-[#004aad]/10 pb-2">Experimental Trial</h5>
                                  <p className="text-sm font-bold text-zinc-600 italic leading-relaxed whitespace-pre-wrap text-left">"{app.experimentText}"</p>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="py-60 flex flex-col items-center justify-center text-zinc-300 gap-8 animate-pulse text-center">
            <BarChart3 size={80} strokeWidth={1} />
            <p className="font-black uppercase tracking-[0.4em] text-sm">Awaiting New Proposals</p>
          </div>
        )}
      </div>
    </section>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="flex items-center gap-6 border-b border-zinc-50 pb-3 text-left">
    <span className="text-[9px] font-black text-zinc-300 uppercase w-28 shrink-0 text-left">{label}</span>
    <span className="text-xs font-black text-zinc-800 text-left">{value || "정보 없음"}</span>
  </div>
);

const MyPage = ({ applications, handleReturn }) => (
  <section className="animate-in fade-in py-20 min-h-screen relative z-10 text-left px-4">
    <div className="flex justify-between items-end mb-20 text-left">
      <div className="flex items-center gap-4 text-zinc-900 text-left">
        <div className="p-4 bg-zinc-900 rounded-3xl text-white shadow-xl shadow-black/10"><User size={32}/></div>
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-left">My Dashboard</h2>
      </div>
      <button onClick={handleReturn} className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-[#004aad] transition-colors font-bold transition-all transition-colors">← Back to Main</button>
    </div>
    <div className="grid gap-12 text-left">
      {applications.length > 0 ? applications.map(app => (
        <div key={app.id} className="bg-white p-10 md:p-16 rounded-[60px] border border-gray-100 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 text-left">
            <div className="flex-1 space-y-6 text-left">
              <div className="flex items-center gap-3 text-left">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white ${app.status === 'confirmed' ? 'bg-green-500' : app.status === 'rejected' ? 'bg-red-400' : 'bg-[#004aad]'}`}>{app.status}</span>
                <span className="text-xs font-black text-zinc-300 uppercase tracking-widest text-left">{app.selectedDate} ~ {addDays(app.selectedDate, 6)}</span>
              </div>
              <h3 className="text-3xl md:text-5xl font-black uppercase text-zinc-900 leading-tight break-words text-left">{app.exhibitionTitle}</h3>
              {app.status === 'rejected' && app.rejectionReason && (
                <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 space-y-3 animate-in slide-in-from-top-4 text-left">
                  <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2 text-left"><AlertCircle size={14}/> 심사 결과 피드백</h4>
                  <p className="text-sm font-bold text-zinc-600 leading-relaxed italic text-left">"{app.rejectionReason}"</p>
                </div>
              )}
            </div>
            <div className="text-right space-y-2 opacity-50">
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Submitted At</p>
               <p className="text-sm font-bold text-zinc-900 text-right">{app.submittedAt?.toDate().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )) : (
        <div className="py-60 flex flex-col items-center justify-center text-zinc-300 gap-8 animate-pulse text-center">
          <div className="p-10 bg-white rounded-full shadow-2xl border border-zinc-100 shadow-sm"><Layers size={80} strokeWidth={1} /></div>
          <p className="font-black uppercase tracking-[0.4em] text-sm text-center">No application history found</p>
        </div>
      )}
    </div>
  </section>
);

const SuccessView = ({ formData, selectedDate, onReturn }) => (
  <section className="max-w-xl mx-auto py-40 text-center animate-in zoom-in-95 duration-700 min-h-screen relative z-10 text-zinc-900 px-4">
    <div className="w-24 h-24 bg-[#004aad]/10 text-[#004aad] rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner shadow-[#004aad]/5"><CheckCircle2 size={48} strokeWidth={3} /></div>
    <h2 className="text-4xl font-black uppercase mb-6 text-[#004aad] text-center">Proposal Received</h2>
    <p className="text-zinc-500 font-light leading-relaxed mb-12 break-keep text-base text-center">작가님의 소중한 제안서가 성공적으로 전달되었습니다. <br/>언프레임 큐레이터 팀이 검토 후 48시간 내에 연락드리겠습니다.</p>
    <button onClick={onReturn} className="w-full border border-zinc-200 text-zinc-400 py-5 rounded-full font-black uppercase text-xs transition-all hover:bg-zinc-50 shadow-sm transition-all text-center">Return to Home</button>
  </section>
);

const StatCard = ({ icon, label, value, color }) => {
  const colorMap = { blue: 'bg-blue-50 text-blue-600 border-blue-100', orange: 'bg-orange-50 text-orange-600 border-orange-100', green: 'bg-green-50 text-green-600 border-green-100' };
  return (
    <div className={`bg-white p-10 rounded-[40px] border shadow-sm flex items-center justify-between transition-all hover:scale-105 ${colorMap[color]}`}>
      <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-left">{label}</p><p className="text-5xl font-black text-zinc-900 leading-none text-left">{value}</p></div>
      <div className="p-5 bg-white rounded-3xl shadow-lg">{icon}</div>
    </div>
  );
};

const CheckCard = ({ icon, label, value, color }) => (
  <div className="bg-white p-10 rounded-[40px] border border-green-100 shadow-sm flex items-center justify-between transition-all hover:scale-105 bg-green-50 text-green-600">
    <div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60 text-left">{label}</p><p className="text-5xl font-black text-zinc-900 leading-none text-left">{value}</p></div>
    <div className="p-5 bg-white rounded-3xl shadow-lg text-center">{icon}</div>
  </div>
);

const FileBtn = ({ label, hasFile, onClick, loading, isPrimary }) => (
  <button onClick={onClick} disabled={loading} className={`py-8 border rounded-[32px] text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden text-center shadow-sm ${hasFile ? (isPrimary ? 'bg-[#004aad] text-white border-transparent shadow-[#004aad]/20' : 'bg-zinc-900 text-white border-transparent') : 'border-zinc-100 hover:bg-zinc-50 text-zinc-800'}`}>
    {loading ? <Loader2 className="animate-spin" size={20}/> : (hasFile ? <CheckCircle size={20}/> : <Upload size={20}/>)}
    {hasFile ? `${label} 완료` : `${label} 업로드`}
    {!hasFile && <span className="text-[7px] opacity-40">PDF, ZIP 가능</span>}
  </button>
);

const AdminLink = ({ href, icon, label }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all text-zinc-800 shadow-sm text-center">{icon} {label}</a>
);

const SupportCard = ({ icon, title, desc }) => (
  <div className="bg-white/80 p-12 border border-gray-50 shadow-sm rounded-[60px] hover:border-[#004aad] transition-all duration-500 group text-zinc-900 backdrop-blur-sm text-left shadow-sm">
    <div className="mb-12 text-zinc-200 group-hover:text-[#004aad] transition-all transform group-hover:scale-110 duration-700 text-left">{icon}</div>
    <h4 className="text-xl md:text-3xl font-black mb-4 uppercase tracking-tighter leading-tight text-left break-keep">{title}</h4>
    <p className="text-base md:text-lg text-zinc-400 font-light leading-relaxed break-keep text-left">{desc}</p>
  </div>
);

const PreparationItem = ({ icon, title, desc }) => (
  <div className="space-y-6 md:space-y-10 group text-zinc-400 text-left">
    <div className="flex items-center gap-4 md:gap-6 transform group-hover:translate-x-4 transition-all duration-500 text-left">
      <div className="p-4 md:p-5 bg-[#004aad]/10 rounded-2xl md:rounded-3xl flex-shrink-0 text-left">{icon}</div>
      <h4 className="text-xl md:text-3xl font-black uppercase text-white tracking-tighter leading-tight text-left">{title}</h4>
    </div>
    <p className="text-base md:text-lg font-light leading-relaxed break-keep text-left">{desc}</p>
  </div>
);

const InputBlock = ({ label, placeholder, required, ...props }) => (
  <div className="space-y-4 text-zinc-900 text-left">
    <label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#004aad] flex items-center gap-2 font-bold text-left">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type="text" placeholder={placeholder} className="w-full bg-zinc-50/50 border border-gray-100 p-5 md:p-7 rounded-[24px] focus:outline-none focus:bg-white font-bold text-base md:text-lg shadow-sm text-zinc-900 transition-all text-left transition-colors font-sans" {...props} />
  </div>
);

const Footer = () => (
  <footer className="border-t border-gray-100 py-32 bg-white/50 text-center relative z-10 text-zinc-900">
    <div className="text-[10px] font-black text-zinc-300 uppercase tracking-[1em] mb-4 text-center font-sans">Beyond the Frame</div>
    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest text-center">© 2026 UNFRAME SEOUL</p>
  </footer>
);

export default App;