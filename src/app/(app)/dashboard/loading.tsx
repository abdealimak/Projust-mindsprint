import React from 'react';
import { Skeleton } from '@/components/ui/Misc';

/** Mirrors the dashboard layout: greeting, prompt bar, next-step card, shortcuts, projects rail. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col xl:flex-row min-h-full" aria-busy="true" aria-label="Loading your workspace">
      <div className="flex-1 min-w-0 px-4 sm:px-10 lg:px-14 pt-8 pb-12 sm:pt-10 lg:pt-14">
        <div className="max-w-[880px] mx-auto">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-12 sm:h-14 w-[80%] mt-5" />
          <Skeleton className="h-12 sm:h-14 w-[60%] mt-3" />
          <Skeleton className="h-4 w-[70%] mt-6" />

          <Skeleton className="h-[92px] w-full mt-10 rounded-m" />

          <div className="pj-card mt-10 p-6">
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-1.5 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-5 w-48 mt-8" />
            <Skeleton className="h-4 w-72 max-w-full mt-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[116px] rounded-m" />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full xl:w-[340px] shrink-0 border-t xl:border-t-0 xl:border-l border-line bg-paper-2 px-4 sm:px-10 xl:px-6 py-8 xl:py-10">
        <Skeleton className="h-7 w-32" />
        <div className="mt-5 space-y-2.5">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-12 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
