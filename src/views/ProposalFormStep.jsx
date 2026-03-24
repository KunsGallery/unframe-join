import React, { useEffect, useRef, useState } from "react";
import {
  Building2,
  Palette,
  ChevronLeft,
  Save,
  Upload,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  doc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  runTransaction,
  addDoc,
  collection,
} from "firebase/firestore";
import InputBlock from "../components/ui/InputBlock";
import FileBtn from "../components/ui/FileBtn";
import { addDays } from "../utils/date";

const getEnv = (key) => {
  try {
    return import.meta.env[key] || "";
  } catch (e) {
    return "";
  }
};

const CLOUDINARY_NAME = getEnv("VITE_CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_PRESET = getEnv("VITE_CLOUDINARY_UPLOAD_PRESET");

const ProposalFormStep = ({
  selectedDate,
  partnerType,
  selectedProgram,
  formData,
  setFormData,
  onBack,
  onSubmitSuccess,
  db,
  appId,
  user,
  handleLogin,
}) => {
  const [isUploading, setIsUploading] = useState(null);

  const fileInputRefs = {
    profile: useRef(),
    highRes: useRef(),
    workList: useRef(),
    portfolio: useRef(),
  };

  const isBrand = partnerType === "brand";

  useEffect(() => {
    if (!selectedDate || !user || user.isAnonymous) return;

    const resDocRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "reservations",
      selectedDate
    );

    const trackWriting = async () => {
      try {
        await updateDoc(resDocRef, { writingCount: increment(1) });
      } catch (e) {
        await setDoc(
          resDocRef,
          { writingCount: 1, status: "writing", updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    };

    trackWriting();

    return () => {
      updateDoc(resDocRef, { writingCount: increment(-1) }).catch(() => {});
    };
  }, [selectedDate, user, db, appId]);

  const handleUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file || !CLOUDINARY_NAME) return;

    setIsUploading(fieldName);

    const isImage = file.type.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", CLOUDINARY_PRESET);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/${resourceType}/upload`,
        {
          method: "POST",
          body: data,
        }
      );

      const result = await res.json();

      if (result.error) {
        console.error("Cloudinary error:", result.error);
        alert(`Upload Failed: ${result.error.message}`);
        return;
      }

      if (result.secure_url) {
        setFormData((prev) => ({ ...prev, [fieldName]: result.secure_url }));
      }
    } catch (err) {
      console.error(err);
      alert("Upload Failed.");
    } finally {
      setIsUploading(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || user.isAnonymous) {
      alert("로그인이 필요합니다.");
      handleLogin();
      return;
    }

    if (!formData.privacyAgreed) {
      alert("개인정보 동의가 필요합니다.");
      return;
    }

    if (!selectedProgram) {
      alert("프로그램을 먼저 선택해 주세요.");
      return;
    }

    try {
      const resDocRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "reservations",
        selectedDate
      );

      await runTransaction(db, async (transaction) => {
        const resSnap = await transaction.get(resDocRef);
        const currentCount = resSnap.exists()
          ? resSnap.data().applicantCount || 0
          : 0;

        transaction.set(
          resDocRef,
          {
            status: "review",
            applicantCount: currentCount + 1,
            updatedAt: serverTimestamp(),
            partnerType,
          },
          { merge: true }
        );
      });

      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "applications"),
        {
          userId: user.uid,
          status: "review",
          selectedDate,
          partnerType,
          selectedProgram,
          ...formData,
          submittedAt: serverTimestamp(),
        }
      );

      onSubmitSuccess();
    } catch (e) {
      console.error(e);
      alert("제출 중 오류가 발생했습니다.");
    }
  };

  return (
    <section className="max-w-4xl mx-auto animate-in fade-in py-10 min-h-screen relative z-10 text-zinc-900 text-left px-4">
      <div className="flex justify-between items-center mb-16 text-left">
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-black flex items-center text-xs font-black uppercase tracking-widest gap-2 transition-all hover:-translate-x-1 transition-colors text-left"
        >
          <ChevronLeft size={16} /> Calendar
        </button>

        <button
          onClick={() =>
            setDoc(
              doc(db, "artifacts", appId, "users", user.uid, "drafts", "current"),
              {
                formData,
                selectedDate,
                selectedProgram,
                lastSaved: serverTimestamp(),
              }
            ).then(() => alert("Saved."))
          }
          className="flex items-center gap-2 bg-zinc-50 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-white border border-transparent hover:border-gray-100 transition-all shadow-sm shadow-zinc-100 text-left"
        >
          <Save size={16} /> Save Draft
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-gray-100 p-8 md:p-20 rounded-[60px] shadow-2xl space-y-16">
        <input
          type="file"
          ref={fileInputRefs.profile}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleUpload(e, "profilePhotoUrl")}
        />
        <input
          type="file"
          ref={fileInputRefs.highRes}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleUpload(e, "highResPhotosUrl")}
        />
        <input
          type="file"
          ref={fileInputRefs.workList}
          className="hidden"
          onChange={(e) => handleUpload(e, "workListUrl")}
        />
        <input
          type="file"
          ref={fileInputRefs.portfolio}
          className="hidden"
          onChange={(e) => handleUpload(e, "portfolioUrl")}
        />

        <header className="border-b border-zinc-100 pb-10 text-left">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#004aad] flex items-center gap-3">
            {isBrand ? <Building2 size={32} /> : <Palette size={32} />}
            {isBrand ? "브랜드 및 기획자 제안 양식" : "아티스트 전시 지원 양식"}
          </h2>
          <p className="text-zinc-400 text-xs mt-2 font-black tracking-widest uppercase">
            일정: {selectedDate} ~ {addDays(selectedDate, 6)}
          </p>

          {selectedProgram && (
            <div className="mt-6 inline-flex flex-col gap-2 bg-[#004aad]/5 border border-[#004aad]/10 rounded-2xl px-5 py-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">
                Selected Program
              </span>
              <span className="text-lg font-black text-zinc-900">
                {selectedProgram.name} · {selectedProgram.price}만원
              </span>
            </div>
          )}
        </header>

        {isBrand ? (
          <div className="grid md:grid-cols-2 gap-12 animate-in fade-in text-left">
            <InputBlock
              label="브랜드명 / 소속"
              required
              value={formData.brandName}
              onChange={(e) =>
                setFormData({ ...formData, brandName: e.target.value })
              }
            />
            <InputBlock
              label="담당자 성함"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in text-left">
            <div className="grid md:grid-cols-2 gap-12 text-left">
              <InputBlock
                label="아티스트 본명"
                required
                value={formData.realName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    realName: e.target.value,
                    name: e.target.value,
                  })
                }
              />
              <InputBlock
                label="활동명 / 예명"
                placeholder="미입력 시 본명 사용"
                value={formData.stageName}
                onChange={(e) =>
                  setFormData({ ...formData, stageName: e.target.value })
                }
              />
            </div>
            <InputBlock
              label="영문 이름"
              placeholder="예: Hong Gil Dong"
              value={formData.englishName}
              onChange={(e) =>
                setFormData({ ...formData, englishName: e.target.value })
              }
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-12 text-left">
          <InputBlock
            label="연락처"
            placeholder="010-0000-0000"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <InputBlock
            label={isBrand ? "설립일" : "생년월일"}
            placeholder="YYYYMMDD"
            required
            value={formData.birthDate}
            onChange={(e) =>
              setFormData({ ...formData, birthDate: e.target.value })
            }
          />
        </div>

        <div className="space-y-6 text-left">
          <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest text-left">
            주소 *
          </label>
          <input
            className="w-full bg-zinc-50/50 border border-gray-100 p-6 rounded-2xl text-base outline-none focus:bg-white shadow-sm font-bold transition-colors text-left"
            placeholder="기본 주소"
            value={formData.addressMain}
            onChange={(e) =>
              setFormData({ ...formData, addressMain: e.target.value })
            }
          />
          <input
            className="w-full bg-zinc-50/50 border border-gray-100 p-6 rounded-2xl text-base outline-none focus:bg-white shadow-sm font-bold transition-colors text-left"
            placeholder="상세 주소"
            value={formData.addressDetail}
            onChange={(e) =>
              setFormData({ ...formData, addressDetail: e.target.value })
            }
          />
        </div>

        <div className="grid md:grid-cols-2 gap-12 border-t border-gray-50 pt-16 text-left">
          <button
            onClick={() => fileInputRefs.profile.current.click()}
            className="aspect-square bg-zinc-50 border border-dashed border-zinc-200 rounded-[48px] flex flex-col items-center justify-center gap-2 hover:bg-white transition-all overflow-hidden relative group shadow-inner"
          >
            {formData.profilePhotoUrl ? (
              <img
                src={formData.profilePhotoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                alt="Profile"
              />
            ) : null}

            {isUploading === "profilePhotoUrl" ? (
              <Loader2 className="animate-spin text-[#004aad]" />
            ) : (
              <div className="z-10 bg-white/80 p-5 rounded-full shadow-xl transition-transform group-hover:scale-110">
                <Upload size={24} className="text-[#004aad]" />
              </div>
            )}

            <div className="text-[9px] font-black text-zinc-400 mt-2 text-center uppercase">
              {isBrand ? "BRAND LOGO" : "PROFILE PHOTO"}
            </div>
          </button>

          <div className="space-y-12 text-zinc-900 text-left">
            <InputBlock
              label="SNS / Website"
              placeholder="@instagram / https://"
              value={formData.snsLink}
              onChange={(e) => setFormData({ ...formData, snsLink: e.target.value })}
            />
            <InputBlock
              label={isBrand ? "프로젝트 명" : "전시명 (가제)"}
              required
              value={formData.exhibitionTitle}
              onChange={(e) =>
                setFormData({ ...formData, exhibitionTitle: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-6 pt-10 border-t border-gray-50 text-left">
          <label className="text-[11px] font-black uppercase text-[#004aad] tracking-widest leading-relaxed text-left">
            {isBrand
              ? "공간 활용 계획 및 협업 제안서 *"
              : "작가 노트 및 프로젝트 개요 *"}
          </label>
          <textarea
            className="w-full bg-zinc-50/50 border border-gray-100 p-6 md:p-10 rounded-[40px] h-80 text-base outline-none focus:bg-white shadow-sm resize-none font-bold transition-colors text-zinc-900 text-left"
            value={isBrand ? formData.projectPurpose : formData.artistNote}
            onChange={(e) =>
              setFormData({
                ...formData,
                [isBrand ? "projectPurpose" : "artistNote"]: e.target.value,
              })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FileBtn
            label="포트폴리오"
            hasFile={!!formData.portfolioUrl}
            onClick={() => fileInputRefs.portfolio.current.click()}
            loading={isUploading === "portfolioUrl"}
          />
          <FileBtn
            label="작품리스트"
            hasFile={!!formData.workListUrl}
            onClick={() => fileInputRefs.workList.current.click()}
            loading={isUploading === "workListUrl"}
          />
          <FileBtn
            label="대표작 원본"
            hasFile={!!formData.highResPhotosUrl}
            onClick={() => fileInputRefs.highRes.current.click()}
            loading={isUploading === "highResPhotosUrl"}
            isPrimary
          />
        </div>

        <div className="pt-20 flex flex-col items-center">
          <label className="flex items-center gap-6 cursor-pointer mb-16 group">
            <input
              type="checkbox"
              checked={formData.privacyAgreed}
              onChange={(e) =>
                setFormData({ ...formData, privacyAgreed: e.target.checked })
              }
              className="w-8 h-8 accent-[#004aad] rounded border-zinc-200"
            />
            <span className="text-sm md:text-lg font-black text-zinc-400 group-hover:text-zinc-900 transition-colors uppercase tracking-widest text-center">
              개인정보 수집 및 이용 동의
            </span>
          </label>

          <button
            onClick={handleSubmit}
            className="w-full bg-zinc-900 text-white py-10 rounded-full font-black uppercase tracking-[0.4em] text-xl md:text-2xl shadow-2xl hover:bg-[#004aad] active:scale-95 transition-all transition-colors text-center shadow-black/10"
          >
            Submit Proposal <ArrowRight size={32} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProposalFormStep;