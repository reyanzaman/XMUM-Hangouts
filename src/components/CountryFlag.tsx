import React from "react";
import type { ComponentType, SVGProps } from "react";
import {
  MY, CN, ID, BD, PK, IN, DZ, TN, YE, UZ, KZ, RU, US, JP, EG, KR, SD,
  SA, SG, TH, VN, PH, NG, KE, SN, ZM
} from "country-flag-icons/react/1x1";

type FlagSvg = ComponentType<SVGProps<SVGSVGElement>>;

const countryFlags: Record<string, FlagSvg> = {
  Malaysia: MY, China: CN, Indonesia: ID, Bangladesh: BD, Pakistan: PK,
  India: IN, Algeria: DZ, Tunisia: TN, Yemen: YE, Uzbekistan: UZ,
  Kazakhstan: KZ, Russia: RU, "United States": US, Japan: JP, Egypt: EG,
  "South Korea": KR, Sudan: SD, "Saudi Arabia": SA, Singapore: SG,
  Thailand: TH, Vietnam: VN, Philippines: PH, Nigeria: NG, Kenya: KE,
  Senegal: SN, Zambia: ZM
};

export const CountryFlag: React.FC<{ country?: string | null; className?: string }> = ({ country, className = "h-5 w-5" }) => {
  const Flag = countryFlags[(country || "").trim()];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 shadow-sm ring-1 ring-black/5 ${className}`}
      role="img"
      aria-label={country ? `${country} flag` : "Country flag"}
      title={country || "Country"}
    >
      {Flag ? <Flag className="h-full w-full scale-110" aria-hidden="true" /> : <span className="h-full w-full bg-slate-200" />}
    </span>
  );
};

export const CountryWithFlag: React.FC<{ country?: string | null; className?: string }> = ({ country, className = "" }) => (
  <span className={`inline-flex items-center gap-1.5 ${className}`}>
    <CountryFlag country={country} />
    <span>{country || "Malaysia"}</span>
  </span>
);
