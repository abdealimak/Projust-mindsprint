import React from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Misc';

export default function DashboardLoading() {
  return (
    <div className="w-full">
      {/* Top greeting skeleton */}
      <div className="mb-4">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column skeleton */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader title={<Skeleton className="h-4 w-28" />} />
            <div className="p-3 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </Card>
          <Card>
            <CardHeader title={<Skeleton className="h-4 w-24" />} />
            <div className="p-3 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        </div>

        {/* Center column skeleton */}
        <div className="lg:col-span-6 space-y-5">
          <Skeleton className="h-28 w-full rounded-[8px]" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-32 w-full rounded-[6px]" />
            <Skeleton className="h-32 w-full rounded-[6px]" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-[6px]" />
            <Skeleton className="h-20 w-full rounded-[6px]" />
            <Skeleton className="h-20 w-full rounded-[6px]" />
          </div>
        </div>

        {/* Right column skeleton */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader title={<Skeleton className="h-4 w-32" />} />
            <div className="p-4 flex flex-col items-center">
              <Skeleton className="h-10 w-16 mb-4" />
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
          </Card>
          <Card>
            <CardHeader title={<Skeleton className="h-4 w-24" />} />
            <div className="p-3 space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
