import { Outlet } from "@tanstack/react-router";
import { useLoginRequired, useMaindata, useVersion } from "@/api/queries";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeSync } from "@/lib/theme";
import { AddTorrentDialog } from "./add-torrent/add-torrent-dialog";
import { DropZone } from "./add-torrent/drop-zone";
import { AppSidebar } from "./app-sidebar";
import { CategoriesDialog } from "./categories-dialog";
import { LoginScreen } from "./login-screen";
import { PhoneNav } from "./phone-nav";

/**
 * The frame of every page. qBittorrent answers 403 when it wants a login (it does not
 * when the client is whitelisted or on localhost with auth bypass), so the login screen
 * only appears after such an answer.
 */
export function AppShell() {
  const loginRequired = useLoginRequired();
  const version = useVersion();
  // Start polling once qBittorrent has answered without asking for a login
  useMaindata(!loginRequired && version.isSuccess);

  if (loginRequired) {
    return (
      <>
        <ThemeSync />
        <LoginScreen />
        <Toaster />
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={400}>
      <ThemeSync />
      <SidebarProvider className="min-h-svh">
        <AppSidebar />
        <SidebarInset className="min-w-0 pb-[calc(68px+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </SidebarInset>
        <PhoneNav />
      </SidebarProvider>
      <AddTorrentDialog />
      <CategoriesDialog />
      <DropZone />
      <Toaster />
    </TooltipProvider>
  );
}
