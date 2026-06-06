import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

function NotFoundComponent() {
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h1 style={{ fontSize: '80px', fontWeight: 'bold', color: '#000' }}>404</h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>Page not found.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => router.history.back()}
            style={{ padding: '10px 20px', border: '1px solid #E5E5E5', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
            ← Go Back
          </button>
          <button onClick={() => navigate({ to: '/dashboard' })}
            style={{ padding: '10px 20px', background: '#FFC947', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}


function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Myntmore Dashboard OS" },
      { name: "description", content: "Internal command center for Myntmore — weekly metrics, Monday reviews, and pipeline." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLayout />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const noSidebarPaths = ['/login', '/accept-invite'];
  const isAuthPath = noSidebarPaths.some(p => path.startsWith(p));
  const showSidebar = user && !isAuthPath;

  if (!showSidebar) {
    return <Outlet />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
