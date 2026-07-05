import { Suspense } from "react";
import DashboardNav from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Suspense fallback={<div className="mb-6 h-12" />}>
        <DashboardNav />
      </Suspense>
      {children}
    </div>
  );
}
