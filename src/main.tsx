import "./styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createQueryClient } from "./api/queries";
import { getLocale } from "./paraglide/runtime.js";
import { routeTree } from "./routeTree.gen";

const queryClient = createQueryClient();

// Hash history: qBittorrent has no SPA fallback, so the path must stay "/" (docs/spec.md)
const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: false,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

document.documentElement.lang = getLocale();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
