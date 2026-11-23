import React from 'react';

interface BrandLogoProps {
  name?: string;
  logoUrl?: string;
  dark?: boolean;
  compact?: boolean;
}

export function BrandLogo({ name = 'StampsBox', logoUrl, dark = false, compact = false }: BrandLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={compact ? 'h-9 w-auto object-contain' : 'h-12 md:h-14 w-auto object-contain'}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {/* Classic postal crest emblem inspired by StampsBox */}
      <svg
        width={compact ? 34 : 44}
        height={compact ? 34 : 44}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="9"
          fill="#17263B"
          stroke={dark ? '#334155' : '#17263B'}
          strokeWidth="1.5"
        />
        {/* Perforated inner stamp border */}
        <rect
          x="7.5"
          y="7.5"
          width="33"
          height="33"
          rx="5"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        {/* Red ribbon & star crest */}
        <path d="M13 28H35V33H13V28Z" fill="#DB1215" />
        <path
          d="M24 12L26.35 17.5L32.3 18.02L27.78 21.95L29.13 27.78L24 24.7L18.87 27.78L20.22 21.95L15.7 18.02L21.65 17.5L24 12Z"
          fill="#FFFFFF"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={`font-editorial tracking-tight font-bold ${
            compact ? 'text-lg' : 'text-[22px]'
          } ${dark ? 'text-white' : 'text-[#17263b]'}`}
        >
          {name}
        </span>
        <span
          className={`text-[9px] font-semibold uppercase tracking-[0.2em] mt-0.5 ${
            dark ? 'text-neutral-400' : 'text-[#db1215]'
          }`}
        >
          US FOREVER POSTAGE
        </span>
      </div>
    </div>
  );
}

export function PaymentBadges() {
  const badges = [
    { label: 'VISA', bg: '#1A1F71', color: '#FFFFFF' },
    { label: 'Mastercard', bg: '#222222', color: '#FFFFFF' },
    { label: 'AMEX', bg: '#2E77BC', color: '#FFFFFF' },
    { label: 'DISCOVER', bg: '#F76B1C', color: '#FFFFFF' },
    { label: 'PayPal', bg: '#003087', color: '#FFFFFF' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((b) => (
        <span
          key={b.label}
          style={{ backgroundColor: b.bg, color: b.color }}
          className="inline-flex items-center justify-center px-2.5 py-1 rounded-[4px] text-[10px] font-bold tracking-wider shadow-xs"
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
