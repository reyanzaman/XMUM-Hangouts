import React from "react";

type SkeletonBlockProps = {
  className?: string;
};

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 ${className}`}
  />
);

export const FeedSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <div className="space-y-6">
    <div className="rounded-3xl bg-gradient-to-r from-rose-500 to-amber-500 p-6 sm:p-8 shadow-md">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <SkeletonBlock className="h-14 w-14 rounded-full bg-white/35" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-5 w-48 bg-white/35" />
            <SkeletonBlock className="h-3 w-full max-w-md bg-white/25" />
            <SkeletonBlock className="h-3 w-3/4 max-w-sm bg-white/20" />
          </div>
        </div>
        <SkeletonBlock className="h-11 w-36 rounded-2xl bg-white/40" />
      </div>
    </div>

    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SkeletonBlock className="h-11 flex-1 rounded-xl" />
          <div className="hidden gap-2 md:flex">
            <SkeletonBlock className="h-11 w-32 rounded-2xl" />
            <SkeletonBlock className="h-11 w-32 rounded-2xl" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-gray-50 pt-3">
          <SkeletonBlock className="h-6 w-24 rounded-lg" />
          <SkeletonBlock className="h-6 w-20 rounded-lg" />
          <SkeletonBlock className="h-6 w-24 rounded-lg" />
          <SkeletonBlock className="h-6 w-16 rounded-lg" />
          <SkeletonBlock className="h-6 w-24 rounded-lg" />
          <SkeletonBlock className="h-6 w-20 rounded-lg" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          className="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
            </div>
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>

          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-3/4" />
            <SkeletonBlock className="h-5 w-2/3" />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50/70 p-3 sm:grid-cols-3">
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>

          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-5/6" />
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <SkeletonBlock className="h-10 flex-1 rounded-2xl" />
            <SkeletonBlock className="h-10 flex-1 rounded-2xl" />
            <SkeletonBlock className="h-10 w-14 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const PortalSkeleton: React.FC = () => (
  <div className="mx-auto max-w-4xl space-y-6 px-1 font-sans sm:px-3">
    <div className="rounded-3xl border border-rose-100/15 bg-gradient-to-r from-rose-500/5 via-rose-500/1 to-transparent p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 space-y-3">
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="h-3 w-full max-w-xl" />
        </div>
        <SkeletonBlock className="h-11 w-44 rounded-2xl" />
      </div>
    </div>

    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-9 w-32 rounded-xl" />
      </div>

      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-5 w-20 rounded-full" />
            <SkeletonBlock className="h-3 w-28" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-5 w-3/4" />
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50/60 p-3 sm:grid-cols-2">
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
          <div className="space-y-2 rounded-2xl bg-slate-50/60 p-3">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-5/6" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
          <div className="flex gap-2 border-t border-slate-100 pt-4">
            <SkeletonBlock className="h-9 w-28 rounded-xl" />
            <SkeletonBlock className="h-9 w-32 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ProfilePageSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <SkeletonBlock className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-3">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-4 w-56" />
          <SkeletonBlock className="h-4 w-full max-w-md" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <SkeletonBlock className="h-5 w-36" />
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-11 w-full" />
        <SkeletonBlock className="h-11 w-full" />
      </div>

      <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <SkeletonBlock className="h-5 w-44" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SkeletonBlock className="h-11 w-full" />
          <SkeletonBlock className="h-11 w-full" />
          <SkeletonBlock className="h-11 w-full" />
          <SkeletonBlock className="h-11 w-full" />
        </div>
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-11 w-36 rounded-2xl" />
      </div>
    </div>
  </div>
);

export const ChatWindowSkeleton: React.FC = () => (
  <div className="flex h-[650px] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
    <div className="hidden w-80 shrink-0 border-r border-gray-50 bg-slate-50/20 md:flex md:flex-col lg:w-96">
      <div className="space-y-2 border-b border-gray-50 p-4">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-3 w-48" />
      </div>
      <div className="space-y-3 p-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl p-2">
            <SkeletonBlock className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-gray-50 p-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        </div>
        <SkeletonBlock className="h-8 w-24 rounded-xl" />
      </div>

      <div className="flex-1 space-y-4 bg-slate-50/10 p-4">
        <SkeletonBlock className="h-14 w-3/4 rounded-2xl" />
        <SkeletonBlock className="ml-auto h-14 w-2/3 rounded-2xl" />
        <SkeletonBlock className="h-20 w-4/5 rounded-2xl" />
        <SkeletonBlock className="ml-auto h-12 w-1/2 rounded-2xl" />
      </div>

      <div className="border-t border-gray-50 p-4">
        <SkeletonBlock className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  </div>
);
