import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  serverTimestamp, updateDoc, addDoc, runTransaction
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { 
  User, Briefcase, ArrowRight, CheckCircle2, Send, Sparkles, 
  Globe, Info, ChevronLeft, ChevronRight, Lock, 
  LogIn, Save, Search, Settings, Eye, ExternalLink, Upload, MapPin, FileText, LayoutDashboard, Users, Loader2, Image as ImageIcon,
  Megaphone, Cpu, Coffee, Truck, ShieldCheck, Briefcase as PortfolioIcon
} from 'lucide-react';

// --- CONFIGURATION ---
const ADMIN_EMAILS = ["gallerykuns@gmail.com", "sklove887@gmail.com"];

const getEnv = (key) => {
  try { return import.meta.env[key] || ""; } catch (e) { return ""; }
};

// Cloudinary 및 Firebase 설정 불러오기
const CLOUDINARY_NAME = getEnv('VITE_CLOUDINARY_CLOUD_NAME');
const CLOUDINARY_API_KEY = getEnv('VITE_CLOUDINARY_API_KEY');
const CLOUDINARY_PRESET = getEnv('VITE_CLOUDINARY_UPLOAD_PRESET');

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

const finalConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;
const app = initializeApp(finalConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'unframe-join';

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

  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    name: '', birthDate: '', phone: '', addressMain: '', addressDetail: '',
    profilePhotoUrl: '', snsLink: '', portfolioUrl: '', exhibitionTitle: '',
    artistNote: '', workListUrl: '', highResPhotosUrl: '', experimentText: '',
    privacyAgreed: false
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsAdmin(ADMIN_EMAILS.includes(u.email));
        // 임시저장 데이터 로드
        const draftRef = doc(db, 'artifacts', appId, 'users', u.uid, 'drafts', 'current');
        const draftSnap = await getDoc(draftRef);
        if (draftSnap.exists()) {
          const data = draftSnap.data();
          setFormData(prev => ({ ...prev, ...data.formData }));
          setSelectedDate(data.selectedDate);
        }
      } else {
        setIsAdmin(false);
        setViewMode('user');
      }
      setLoading(false);
    });

    const resRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservations');
    const unsubscribeRes = onSnapshot(resRef, (snap) => {
      const resMap = {};
      snap.forEach(d => { resMap[d.id] = d.data(); });
      setReservations(resMap);
    }, (err) => console.error("Firebase Error:", err));

    return () => { unsubscribeAuth(); unsubscribeRes(); };
  }, []);

  useEffect(() => {
    if (!isAdmin || viewMode !== 'admin') return;
    const appRef = collection(db, 'artifacts', appId, 'public', 'data', 'applications');
    const unsubscribeApp = onSnapshot(appRef, (snap) => {
      const appList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setApplications(appList);
    });
    return () => unsubscribeApp();
  }, [isAdmin, viewMode]);

  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  const handleSignOut = () => signOut(auth);

  const saveDraft = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'drafts', 'current'), {
        formData, selectedDate, lastSaved: serverTimestamp()
      });
    } catch (e) { console.error("Draft Save Error:", e); }
  };

  const handleStepTransition = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1a1a1a] font-sans selection:bg-[#004aad] selection:text-white overflow-x-hidden">
      <Navbar 
        user={user} 
        isAdmin={isAdmin} 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
        handleLogin={handleLogin} 
        handleSignOut={handleSignOut} 
        reset={() => {setCurrentStep(1); setIsSubmitSuccess(false); setSelectedDate(null);}}
      />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-32">
        {isSubmitSuccess ? (
          <SuccessView onReturn={() => {setIsSubmitSuccess(false); setCurrentStep(1); setSelectedDate(null);}} />
        ) : viewMode === 'admin' ? (
          <AdminDashboard applications={applications} />
        ) : (
          <div className="transition-all duration-700 ease-in-out">
            {currentStep === 1 && (
              <LandingPage onStart={() => handleStepTransition(2)} />
            )}
            {currentStep === 2 && (
              <CalendarStep 
                reservations={reservations} 
                onSelect={(date) => {setSelectedDate(date); handleStepTransition(3);}} 
                onBack={() => handleStepTransition(1)}
              />
            )}
            {currentStep === 3 && (
              <ProposalFormStep 
                selectedDate={selectedDate}
                formData={formData}
                setFormData={setFormData}
                saveDraft={saveDraft}
                onBack={() => handleStepTransition(2)}
                onSubmitSuccess={() => setIsSubmitSuccess(true)}
                db={db}
                appId={appId}
                user={user}
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

const LoadingOverlay = () => (
  <div className="h-screen flex flex-col items-center justify-center font-black text-[#004aad] bg-[#fdfbf7] z-[1000]">
    <Loader2 className="animate-spin size-12 mb-4" />
    <span className="animate-pulse tracking-[0.5em] uppercase text-xs">Unframe Resonance</span>
  </div>
);

const Navbar = ({ user, isAdmin, viewMode, setViewMode, handleLogin, handleSignOut, reset }) => (
  <nav className="fixed top-0 w-full z-[100] px-8 py-6 flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-gray-100">
    <div className="text-2xl font-black tracking-tighter cursor-pointer" onClick={reset}>UNFRAME</div>
    <div className="flex items-center gap-6">
      {isAdmin && (
        <button 
          onClick={() => setViewMode(viewMode === 'user' ? 'admin' : 'user')}
          className="text-[9px] font-black uppercase tracking-[0.2em] bg-black text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-[#004aad] transition-all"
        >
          {viewMode === 'user' ? <><LayoutDashboard size={12}/> Admin Panel</> : <><User size={12}/> User View</>}
        </button>
      )}
      {user ? (
        <div className="flex items-center gap-4 border-l pl-6 border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.displayName}</span>
          <button onClick={handleSignOut} className="text-[10px] font-black text-red-400 uppercase">Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin} className="text-[10px] font-black uppercase tracking-widest border border-gray-200 px-5 py-2.5 rounded-full hover:bg-black hover:text-white transition-all">Login</button>
      )}
    </div>
  </nav>
);

const LandingPage = ({ onStart }) => (
  <div className="animate-in fade-in duration-1000 space-y-40">
    <header className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      <span className="text-[#004aad] uppercase tracking-[0.5em] text-xs font-black mb-8 block animate-bounce">Collaboration & Rental</span>
      <h1 className="text-7xl md:text-[11rem] font-black uppercase leading-[0.85] mb-12 tracking-tighter">Start Your<br />Resonance</h1>
      <p className="max-w-2xl mx-auto text-xl text-gray-400 font-light leading-relaxed px-4 break-keep">작가의 철학과 공간의 조화, 새로운 감각이 연결되는 순간.<br/>언프레임이 제안하는 파트너십을 확인해 보세요.</p>
    </header>

    <section className="min-h-[90vh] py-32 border-t border-gray-100">
      <div className="mb-24">
        <h2 className="text-xs font-bold uppercase tracking-[0.6em] mb-4 text-[#004aad]">What We Offer</h2>
        <h3 className="text-5xl md:text-8xl font-black tracking-tighter uppercase">🤝 UNFRAME 지원사항</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <SupportCard icon={<Megaphone size={48} />} title="홍보 및 큐레이션 지원" desc="갤러리 공식 SNS 포스팅은 물론 현수막, 홍보 엽서 제작을 지원합니다. 또한 작가님의 세계관을 깊이 전달할 수 있는 Curatorial Notes를 작성해 드립니다." />
        <SupportCard icon={<Cpu size={48} />} title="장비 대여 및 설치 지원" desc="최적의 관람 환경을 위해 레일 스포트라이트 조명, 고해상도 빔프로젝터 및 스피커 등을 제공합니다. 기술적인 고민 없이 작품에만 집중하세요." />
        <SupportCard icon={<User size={48} />} title="전시 운영 인력 상주" desc="전시 기간 동안 전문 디렉터가 상주하며 관람객 안내, 소중한 작품의 보호, 그리고 구매 문의에 대한 응대를 책임집집니다." />
        <SupportCard icon={<Coffee size={48} />} title="행사 및 편의 지원" desc="오프닝 리셉션 등 행사 시 다과 세팅을 지원하며, 방문하시는 작가님과 내빈을 위한 무료 주차(1시간) 서비스를 제공합니다." />
      </div>
    </section>

    <section className="bg-[#1a1a1a] text-white py-48 px-8 md:px-20 rounded-[80px] relative overflow-hidden min-h-screen flex flex-col justify-center shadow-2xl">
      <div className="mb-32 text-center">
        <h2 className="text-xs font-bold uppercase tracking-[0.6em] mb-4 text-[#004aad]">Preparation</h2>
        <h3 className="text-5xl md:text-8xl font-black tracking-tighter uppercase">🧳 작가님 준비사항</h3>
      </div>
      <div className="grid md:grid-cols-3 gap-20 max-w-6xl mx-auto">
        <PreparationItem icon={<Truck size={40} className="text-[#004aad]" />} title="운송 및 철수" desc="작품의 운송, 포장, 설치 및 철수 작업은 작가님이 직접 주관합니다. 전시 후에는 공간을 원래 모습 그대로 원상복구 해주시는 배려를 부탁드립니다." />
        <PreparationItem icon={<FileText size={40} className="text-[#004aad]" />} title="전시 정보 전달" desc="효과적인 홍보를 위해 고화질 작품 사진, 최종 리스트, 작가 노트를 미리 전달해 주세요. 보내주시는 이미지는 마케팅 목적으로 사용될 수 있습니다." />
        <PreparationItem icon={<ShieldCheck size={40} className="text-[#004aad]" />} title="작품 관리" desc="전시 기간 중 발생할 수 있는 파손이나 도난에 대비한 보험 가입은 선택 사항입니다. 갤러리는 고의나 중과실이 없는 한 책임지지 않습니다." />
      </div>
    </section>

    <section className="min-h-[80vh] flex flex-col justify-center border-b border-gray-100 pb-40">
      <div className="grid lg:grid-cols-2 gap-32 items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.6em] mb-12 text-[#004aad]">Value of Partnership</h2>
          <h3 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-12 uppercase">예술적 실천을 위한<br />정직한 약속</h3>
          <p className="text-xl text-gray-500 font-light leading-relaxed break-keep italic">언프레임은 공간이 작가의 언어를 온전히 담아낼 때 그 가치가 완성된다고 믿습니다. 우리는 작가님들이 활동을 지속할 수 있는 <span className="text-black font-bold">지속 가능한 전시 환경</span>을 지향합니다.</p>
        </div>
        <div className="bg-white border border-gray-100 p-12 md:p-20 shadow-2xl rounded-[64px] relative overflow-hidden group">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-300 mb-10 block">Rental Investment</span>
          <div className="flex items-baseline gap-6 mb-16">
            <span className="text-7xl md:text-9xl font-black tracking-tighter">2,800,000</span>
            <span className="text-2xl text-gray-400 font-bold uppercase">KRW / WEEK</span>
          </div>
          <button 
            onClick={onStart}
            className="w-full bg-[#004aad] text-white py-8 rounded-full font-black uppercase tracking-[0.4em] text-xl flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl shadow-[#004aad]/20 active:scale-95"
          >
            <Sparkles size={24} /> UNFRAME 과 함께하기 <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </section>
  </div>
);

const CalendarStep = ({ reservations, onSelect, onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
  const firstDayOfMonth = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; 
  }, [currentDate]);

  return (
    <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto py-20">
      <div className="text-center mb-24">
        <h2 className="text-6xl md:text-9xl font-black tracking-tighter uppercase mb-8 leading-none">Schedule<br/>Calendar</h2>
        <p className="text-gray-400 text-lg font-light uppercase tracking-widest break-keep">전시 시작일인 <span className="text-black font-bold">목요일</span>을 선택해주세요.</p>
      </div>

      <div className="bg-white p-12 md:p-20 rounded-[80px] shadow-2xl border border-gray-50">
        <div className="flex justify-between items-center mb-16 px-4">
          <h3 className="text-4xl font-black tracking-tighter uppercase">{currentDate.getFullYear()}. {(currentDate.getMonth() + 1).toString().padStart(2, '0')}</h3>
          <div className="flex gap-6">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-4 bg-gray-50 hover:bg-[#004aad] hover:text-white rounded-full transition-all"><ChevronLeft size={32}/></button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-4 bg-gray-50 hover:bg-[#004aad] hover:text-white rounded-full transition-all"><ChevronRight size={32}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-6 mb-10 border-b border-gray-100 pb-10">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, idx) => (
            <div key={d} className={`text-center text-xs font-black uppercase tracking-[0.2em] ${idx === 6 ? 'text-red-500' : 'text-gray-300'}`}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-5">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="aspect-square opacity-0" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isThu = dateObj.getDay() === 4;
            const isSun = dateObj.getDay() === 0;
            const res = reservations[dateStr];
            const applicantCount = res?.applicantCount || 0;

            return (
              <div key={day} className="relative group aspect-square">
                <button 
                  disabled={!isThu || res?.status === 'confirmed'}
                  onClick={() => onSelect(dateStr)}
                  className={`w-full h-full rounded-3xl flex flex-col items-center justify-center transition-all border-2
                    ${!isThu ? 'border-transparent text-gray-200 cursor-default' : 
                      res?.status === 'confirmed' ? 'bg-gray-50 border-gray-50 text-gray-300' :
                      applicantCount > 0 ? 'bg-[#004aad]/5 border-[#004aad]/30 text-[#004aad] scale-105 shadow-inner' :
                      'border-gray-100 hover:border-[#004aad] text-black font-black hover:scale-105'}`}
                >
                  <span className={`text-xl ${isSun ? 'text-red-500' : ''} ${!isThu && !isSun ? 'text-gray-300' : ''}`}>{day}</span>
                  {isThu && applicantCount > 0 && res?.status !== 'confirmed' && (
                    <div className="mt-2 flex items-center gap-1 text-[10px]"><Users size={10} /> {applicantCount}</div>
                  )}
                </button>
                {res && (
                  <div className={`absolute -top-2 -right-1 px-2 py-1 rounded-lg text-[8px] font-black text-white uppercase shadow-sm z-10
                    ${res.status === 'confirmed' ? 'bg-gray-400' : applicantCount > 0 ? 'bg-[#004aad]' : 'bg-orange-400 animate-pulse'}`}>
                    {res.status === 'confirmed' ? '마감' : applicantCount > 0 ? `심사중(${applicantCount})` : '작성중'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={onBack} className="mt-20 mx-auto block text-gray-400 font-black uppercase tracking-widest text-xs hover:text-black transition-colors">← Back to Information</button>
    </section>
  );
};

const ProposalFormStep = ({ selectedDate, formData, setFormData, saveDraft, onBack, onSubmitSuccess, db, appId, user }) => {
  const [isUploading, setIsUploading] = useState(null);
  
  const profileInputRef = useRef(null);
  const highResInputRef = useRef(null);
  const workListInputRef = useRef(null);
  const portfolioInputRef = useRef(null);

  // Cloudinary 통합 업로드 함수 (이미지, PDF, ZIP 모두 지원)
  const handleCloudinaryUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!CLOUDINARY_NAME || !CLOUDINARY_PRESET) {
      alert("Cloudinary 설정이 필요합니다. .env 파일을 확인해 주세요.");
      return;
    }

    setIsUploading(fieldName);
    
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', CLOUDINARY_PRESET);
    uploadData.append('api_key', CLOUDINARY_API_KEY);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/auto/upload`, {
        method: 'POST',
        body: uploadData
      });
      const result = await response.json();
      if (result.secure_url) {
        setFormData(prev => ({ ...prev, [fieldName]: result.secure_url }));
      } else {
        throw new Error(result.error?.message || "Upload failed");
      }
    } catch (e) {
      console.error(e);
      alert("파일 업로드 실패: " + e.message);
    } finally {
      setIsUploading(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.privacyAgreed) return alert("개인정보 동의가 필요합니다.");
    try {
      const resDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservations', selectedDate);
      await runTransaction(db, async (transaction) => {
        const resSnap = await transaction.get(resDocRef);
        const newCount = (resSnap.exists() ? (resSnap.data().applicantCount || 0) : 0) + 1;
        transaction.set(resDocRef, { status: 'review', applicantCount: newCount, updatedAt: serverTimestamp() }, { merge: true });
      });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'applications'), {
        userId: user.uid, status: 'review', selectedDate, ...formData, submittedAt: serverTimestamp()
      });
      onSubmitSuccess();
    } catch (e) { alert("Submission Error"); }
  };

  return (
    <section className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 py-10">
      <div className="flex justify-between items-center mb-16">
        <button onClick={onBack} className="text-gray-400 hover:text-black flex items-center text-xs font-black uppercase tracking-widest gap-2 transition-all hover:-translate-x-1"><ChevronLeft size={16}/> Calendar</button>
        <button onClick={saveDraft} className="flex items-center gap-2 bg-gray-50 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-white border border-transparent hover:border-gray-100 transition-all shadow-sm"><Save size={16}/> Save Draft</button>
      </div>
      
      <header className="mb-20">
        <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-6 flex items-center gap-4 break-keep leading-tight">
          <Sparkles className="text-[#004aad] size-10 flex-shrink-0" /> 작가님과 전시에 대해 알려주세요
        </h2>
        <span className="bg-[#004aad]/10 text-[#004aad] px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-sm inline-block">Selected Date: {selectedDate} (Thu)</span>
      </header>

      <div className="bg-white border border-gray-100 p-10 md:p-20 rounded-[80px] shadow-2xl space-y-16">
        <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleCloudinaryUpload(e, 'profilePhotoUrl')} />
        <input type="file" ref={highResInputRef} className="hidden" accept="image/*" onChange={(e) => handleCloudinaryUpload(e, 'highResPhotosUrl')} />
        <input type="file" ref={workListInputRef} className="hidden" accept=".pdf,.doc,.docx,.zip" onChange={(e) => handleCloudinaryUpload(e, 'workListUrl')} />
        <input type="file" ref={portfolioInputRef} className="hidden" accept=".pdf,.doc,.docx,.zip,.jpg,.png" onChange={(e) => handleCloudinaryUpload(e, 'portfolioUrl')} />

        <div className="grid md:grid-cols-2 gap-12">
          <InputBlock label="이름" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <InputBlock label="생년월일" placeholder="YYYYMMDD" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
        </div>
        <InputBlock label="연락처" placeholder="010-0000-0000" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        
        <div className="space-y-6">
          <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest">주소 *</label>
          <input className="w-full bg-gray-50/50 border border-gray-100 p-6 rounded-2xl text-base outline-none focus:bg-white transition-all shadow-sm" placeholder="기본 주소" value={formData.addressMain} onChange={e => setFormData({...formData, addressMain: e.target.value})} />
          <input className="w-full bg-gray-50/50 border border-gray-100 p-6 rounded-2xl text-base outline-none focus:bg-white transition-all shadow-sm" placeholder="상세 주소" value={formData.addressDetail} onChange={e => setFormData({...formData, addressDetail: e.target.value})} />
        </div>

        <div className="grid md:grid-cols-2 gap-12 border-t border-gray-50 pt-16">
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest">프로필 사진 *</label>
            <button onClick={() => profileInputRef.current.click()} disabled={isUploading === 'profilePhotoUrl'} className="w-full aspect-square bg-gray-50 border border-dashed border-gray-200 rounded-[48px] flex flex-col items-center justify-center gap-2 hover:bg-white transition-all overflow-hidden relative group">
              {formData.profilePhotoUrl ? <img src={formData.profilePhotoUrl} className="absolute inset-0 w-full h-full object-cover" alt="Profile" /> : null}
              {isUploading === 'profilePhotoUrl' ? <Loader2 className="animate-spin text-[#004aad]" /> : <div className="z-10 bg-white/80 p-5 rounded-full shadow-xl transition-transform group-hover:scale-110"><Upload size={24} className="text-[#004aad]" /></div>}
            </button>
          </div>
          <div className="space-y-12">
            <InputBlock label="SNS / Website" placeholder="@instagram" value={formData.snsLink} onChange={e => setFormData({...formData, snsLink: e.target.value})} />
            <InputBlock label="전시명(가제)" required value={formData.exhibitionTitle} onChange={e => setFormData({...formData, exhibitionTitle: e.target.value})} />
          </div>
        </div>

        <div className="space-y-6 pt-10 border-t border-gray-50">
          <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest">작가 노트 (Artist Note)</label>
          <textarea className="w-full bg-gray-50/50 border border-gray-100 p-10 rounded-[60px] h-80 text-base outline-none focus:bg-white transition-all resize-none shadow-sm" value={formData.artistNote} onChange={e => setFormData({...formData, artistNote: e.target.value})} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <button onClick={() => portfolioInputRef.current.click()} className="py-8 border border-gray-100 rounded-[32px] text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm relative overflow-hidden">
              {isUploading === 'portfolioUrl' ? <Loader2 className="animate-spin" size={20}/> : <PortfolioIcon size={20}/>}
              {formData.portfolioUrl ? "포트폴리오 완료" : "포트폴리오 업로드"}
              <div className="text-[8px] text-gray-300">PDF, ZIP, 이미지</div>
            </button>
            <button onClick={() => workListInputRef.current.click()} className="py-8 border border-gray-100 rounded-[32px] text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm relative overflow-hidden">
              {isUploading === 'workListUrl' ? <Loader2 className="animate-spin" size={20}/> : <FileText size={20}/>}
              {formData.workListUrl ? "리스트 완료" : "작품 리스트 업로드"}
              <div className="text-[8px] text-gray-300">PDF, ZIP 가능</div>
            </button>
            <button onClick={() => highResInputRef.current.click()} className="py-8 bg-[#004aad]/5 text-[#004aad] border border-[#004aad]/10 rounded-[32px] text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-3 hover:bg-[#004aad]/10 transition-all shadow-sm relative overflow-hidden lg:col-span-1 md:col-span-2">
              {isUploading === 'highResPhotosUrl' ? <Loader2 className="animate-spin" size={20}/> : <ImageIcon size={20}/>}
              {formData.highResPhotosUrl ? "사진 완료" : "고화질 사진 업로드"}
              <div className="text-[8px] opacity-50 uppercase">Images only</div>
            </button>
        </div>

        <div className="space-y-8 pt-10 border-t border-gray-50">
            <label className="text-base font-black leading-relaxed text-gray-700 break-keep bg-[#004aad]/5 p-10 rounded-[50px] border border-[#004aad]/10 block shadow-inner italic">
              💥 <span className="text-[#004aad] not-italic">UNFRAME</span>은 작가님의 '틀을 깨는 시도'를 응원합니다. 이번 전시에서 작가님이 도전하고자 하는 실험은 무엇인가요?
            </label>
            <textarea className="w-full border-2 border-dashed border-gray-100 p-10 rounded-[60px] h-80 text-base outline-none focus:border-[#004aad]/30 transition-all resize-none font-medium" value={formData.experimentText} onChange={e => setFormData({...formData, experimentText: e.target.value})} />
        </div>

        <div className="pt-20 flex flex-col items-center">
          <label className="flex items-center gap-6 cursor-pointer mb-16 group">
            <input type="checkbox" checked={formData.privacyAgreed} onChange={e => setFormData({...formData, privacyAgreed: e.target.checked})} className="w-8 h-8 accent-[#004aad] rounded border-gray-200" />
            <span className="text-lg font-black text-gray-400 group-hover:text-black transition-colors uppercase tracking-widest">개인정보 수집 및 이용 동의</span>
          </label>
          <button onClick={handleSubmit} className="w-full bg-black text-white py-10 rounded-[40px] font-black uppercase tracking-[0.4em] text-2xl flex items-center justify-center gap-6 hover:bg-[#004aad] transition-all shadow-2xl active:scale-95 shadow-black/10">Submit Proposal <ArrowRight size={32}/></button>
        </div>
      </div>
    </section>
  );
};

const AdminDashboard = ({ applications }) => (
  <section className="animate-in fade-in duration-700">
    <h2 className="text-5xl font-black tracking-tighter uppercase mb-12">Applications Panel</h2>
    <div className="grid gap-6">
      {applications.sort((a,b) => b.submittedAt - a.submittedAt).map(app => (
        <div key={app.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:border-[#004aad] transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                  <span className={`px-2 py-1 rounded text-[8px] font-black uppercase text-white ${app.status === 'review' ? 'bg-[#004aad]' : 'bg-green-400'}`}>{app.status}</span>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{app.selectedDate}</span>
              </div>
              <h3 className="text-2xl font-black mb-1 uppercase tracking-tight break-all leading-tight">{app.exhibitionTitle || "Untitled"}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest text-sm">Artist: {app.name}</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {app.portfolioUrl && <a href={app.portfolioUrl} target="_blank" className="px-4 py-4 border border-gray-100 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase hover:bg-gray-50"><PortfolioIcon size={14}/> Portfolio</a>}
              {app.workListUrl && <a href={app.workListUrl} target="_blank" className="px-4 py-4 border border-gray-100 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase hover:bg-gray-50"><FileText size={14}/> List</a>}
              <button className="px-6 py-4 bg-[#004aad] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#003d8f]">Confirm</button>
            </div>
        </div>
      ))}
      {applications.length === 0 && <div className="py-40 text-center text-gray-400 font-bold uppercase tracking-widest">No proposals found</div>}
    </div>
  </section>
);

const SuccessView = ({ onReturn }) => (
  <section className="max-w-xl mx-auto py-40 text-center animate-in zoom-in-95 duration-700">
    <div className="w-24 h-24 bg-[#004aad]/10 text-[#004aad] rounded-full flex items-center justify-center mx-auto mb-10">
      <CheckCircle2 size={48} strokeWidth={3} />
    </div>
    <h2 className="text-4xl font-black tracking-tighter uppercase mb-6 text-[#004aad]">Proposal Received</h2>
    <p className="text-gray-500 font-light leading-relaxed mb-12 break-keep text-base">
      작가님의 소중한 제안서가 성공적으로 전달되었습니다. <br/>
      언프레임 큐레이터 팀이 검토 후 48시간 내에 연락드리겠습니다.
    </p>
    <button onClick={onReturn} className="px-12 py-5 bg-black text-white rounded-full font-black uppercase tracking-widest text-xs transition-all hover:scale-110 shadow-xl">Return to Home</button>
  </section>
);

const SupportCard = ({ icon, title, desc }) => (
  <div className="bg-white p-16 border border-gray-50 shadow-sm rounded-[60px] hover:border-[#004aad] hover:-translate-y-4 transition-all duration-500 group">
    <div className="mb-12 text-gray-200 group-hover:text-[#004aad] transition-all transform group-hover:scale-110 duration-700">{icon}</div>
    <h4 className="text-3xl font-black mb-8 tracking-tighter uppercase leading-tight">{title}</h4>
    <p className="text-lg text-gray-400 font-light leading-relaxed break-keep">{desc}</p>
  </div>
);

const PreparationItem = ({ icon, title, desc }) => (
  <div className="space-y-10 group">
    <div className="flex items-center gap-6 transform group-hover:translate-x-4 transition-all duration-500">
      <div className="p-5 bg-[#004aad]/10 rounded-3xl flex-shrink-0">{icon}</div>
      <h4 className="text-3xl font-black uppercase tracking-tighter leading-tight">{title}</h4>
    </div>
    <p className="text-gray-400 font-light leading-relaxed break-keep text-lg">{desc}</p>
  </div>
);

const InputBlock = ({ label, placeholder, required, ...props }) => (
  <div className="space-y-5">
    <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#004aad] flex items-center gap-2">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type="text" placeholder={placeholder} className="w-full bg-gray-50/50 border border-gray-100 p-7 rounded-[32px] focus:outline-none focus:bg-white transition-all font-bold text-lg shadow-sm" {...props} />
  </div>
);

const Footer = () => (
  <footer className="border-t border-gray-100 py-32 bg-white/50 text-center">
    <div className="text-[11px] font-black text-gray-300 uppercase tracking-[1em] mb-4">Beyond the Frame, Into the Art</div>
    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2026 UNFRAME SEOUL</p>
  </footer>
);

export default App;