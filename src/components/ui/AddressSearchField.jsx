import React, { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { unframeDesign } from "./unframeDesign";
import { loadDaumPostcodeScript } from "../../lib/daumPostcode";

const AddressSearchField = ({
  label = "주소",
  required = false,
  value = "",
  detailValue = "",
  placeholder = "주소를 검색해 주세요",
  detailPlaceholder = "상세주소를 입력해 주세요",
  disabled = false,
  onChange,
}) => {
  const [scriptStatus, setScriptStatus] = useState("idle");
  const detailInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    loadDaumPostcodeScript()
      .then(() => {
        if (!cancelled) {
          setScriptStatus("ready");
        }
      })
      .catch((error) => {
        console.error("daum postcode preload failed:", error);
        if (!cancelled) {
          setScriptStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (patch) => {
    if (typeof onChange === "function") {
      onChange(patch);
    }
  };

  const focusDetailInput = () => {
    window.requestAnimationFrame(() => {
      detailInputRef.current?.focus?.();
    });
  };

  const handleSearch = async () => {
    if (disabled) return;

    setScriptStatus("loading");

    try {
      const daum = await loadDaumPostcodeScript();
      setScriptStatus("ready");

      new daum.Postcode({
        oncomplete(data) {
          updateField({
            addressMain: data.roadAddress || data.jibunAddress || "",
            addressDetail: "",
          });
          focusDetailInput();
        },
      }).open();
    } catch (error) {
      console.error("daum postcode load failed:", error);
      setScriptStatus("error");
    }
  };

  return (
    <div className="space-y-3 text-zinc-900 text-left">
      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad] text-left">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <button
            type="button"
            onClick={handleSearch}
            disabled={disabled}
            aria-label="주소 검색 열기"
            className={`${unframeDesign.inputPublic} min-h-[52px] flex items-center justify-start cursor-pointer text-left`}
          >
            <span
              className={`truncate ${value ? "text-zinc-900" : "text-zinc-300"}`}
            >
              {value || placeholder}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSearch}
            disabled={disabled || scriptStatus === "loading"}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-zinc-900 bg-[#004AAD] px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[2px_2px_0px_#000] transition-all hover:bg-[#003b8a] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {scriptStatus === "loading" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            주소 검색
          </button>
        </div>

        <input
          ref={detailInputRef}
          type="text"
          value={detailValue}
          onChange={(e) =>
            updateField({
              addressDetail: e.target.value,
            })
          }
          placeholder={detailPlaceholder}
          disabled={disabled}
          className={`${unframeDesign.inputPublic} min-h-[52px]`}
        />
      </div>

      {scriptStatus === "error" ? (
        <p className="text-[11px] sm:text-xs font-black leading-relaxed text-red-500 break-keep">
          주소 검색을 불러오지 못했습니다. 버튼을 다시 눌러 주세요.
        </p>
      ) : (
        <p className="text-[11px] sm:text-xs font-black leading-relaxed text-zinc-400 break-keep">
          주소 검색 버튼을 눌러 기본 주소를 선택해 주세요.
        </p>
      )}
    </div>
  );
};

export default AddressSearchField;
