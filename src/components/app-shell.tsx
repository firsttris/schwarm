import { Outlet } from "@tanstack/react-router";
import { useLoginRequired, useMaindata, useVersion } from "@/api/queries";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { addDialogStore } from "@/lib/add-dialog";
import { lazyNamed, WhenUsed } from "@/lib/lazy";
import { manageStore } from "@/lib/manage";
import { ThemeSync } from "@/lib/theme";
import { DropZone } from "./add-torrent/drop-zone";
import { AppSidebar } from "./app-sidebar";
import { LoginScreen } from "./login-screen";
import { PhoneNav } from "./phone-nav";

/**
 * The frame of every page. qBittorrent answers 403 when it wants a login (it does not
 * when the client is whitelisted or on localhost with auth bypass), so the login screen
 * only appears after such an answer.
 */
// Loaded on first use (docs: code splitting)
const AddTorrentDialog = lazyNamed(() => import("./add-torrent/add-torrent-dialog"), "AddTorrentDialog");
const CategoriesDialog = lazyNamed(() => import("./categories-dialog"), "CategoriesDialog");

export function AppShell() {
  const addOpen = addDialogStore.use().open;
  const manageOpen = manageStore.use().open;
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
      <WhenUsed active={addOpen}>
        <AddTorrentDialog />
      </WhenUsed>
      <WhenUsed active={manageOpen}>
        <CategoriesDialog />
      </WhenUsed>
      <DropZone />
      <Toaster />
    </TooltipProvider>
  );
}
