import { useState } from 'react';

interface NodakLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'wordmark' | 'emblem';
}

export function NodakLogo({ className = '', size = 'md', variant = 'wordmark' }: NodakLogoProps) {
  const [wordmarkFailed, setWordmarkFailed] = useState(false);
  const [emblemFailed, setEmblemFailed] = useState(false);

  const heightClass =
    size === 'sm' ? 'h-5' : size === 'lg' ? 'h-8 sm:h-9' : 'h-6';

  if (variant === 'emblem') {
    return (
      <span className={`inline-flex items-center whitespace-nowrap shrink-0 ${className}`}>
        {!emblemFailed ? (
          <img
            src="/assets/aistudio/Logo_NODAK_en_azulgrana_7ea3d991.png"
            alt="NODAK Azulgrana"
            referrerPolicy="no-referrer"
            onError={() => setEmblemFailed(true)}
            className="h-9 w-16 rounded-lg border border-white/15 object-cover"
          />
        ) : (
          <span className="inline-flex h-9 w-16 items-center justify-center rounded-lg border border-[#fccb06]/40 bg-[#070d29] font-display text-xs font-black tracking-[0.12em] text-[#fccb06]">
            NODAK
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center whitespace-nowrap shrink-0 ${className}`}>
      {!wordmarkFailed ? (
        <img
          src="/assets/nodak-wordmark.png"
          alt="NODAK"
          referrerPolicy="no-referrer"
          onError={() => setWordmarkFailed(true)}
          className={`${heightClass} w-auto object-contain select-none`}
        />
      ) : (
        <span className="font-display text-xl font-black tracking-[0.14em] text-[#fccb06]">
          NODAK
        </span>
      )}
    </span>
  );
}
