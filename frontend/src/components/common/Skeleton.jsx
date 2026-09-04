import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-200/70 dark:bg-slate-800/80 rounded-lg ${className}`} />;
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
};

export const TableRowSkeleton = () => {
  return (
    <div className="flex items-center justify-between py-4 px-6 border-b border-slate-100 dark:border-slate-800 animate-pulse">
      <div className="flex items-center space-x-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-24" />
    </div>
  );
};

export default Skeleton;
