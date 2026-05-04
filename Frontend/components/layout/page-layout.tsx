"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "./footer";
import { useDrawer } from "@/lib/context/drawer-context";

interface PageLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

export function PageLayout({ children, activePage = "" }: PageLayoutProps) {
  const { isAnyDrawerOpen } = useDrawer();

  return (
    <div className="flex h-screen bg-gray-100">
      {!isAnyDrawerOpen && <Sidebar activePage={activePage} />}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 relative">
          {/* Removed container and mx-auto */}
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
