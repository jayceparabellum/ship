import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient, queryPersister } from '@/lib/queryClient';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { RealtimeEventsProvider } from '@/hooks/useRealtimeEvents';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DocumentsProvider } from '@/contexts/DocumentsContext';
import { ProgramsProvider } from '@/contexts/ProgramsContext';
import { IssuesProvider } from '@/contexts/IssuesContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import { ArchivedPersonsProvider } from '@/contexts/ArchivedPersonsContext';
import { CurrentDocumentProvider } from '@/contexts/CurrentDocumentContext';
import { UploadProvider } from '@/contexts/UploadContext';
import { AppLayout } from '@/pages/App';
import { ReviewQueueProvider } from '@/contexts/ReviewQueueContext';

import { ToastProvider } from '@/components/ui/Toast';
import { MutationErrorToast } from '@/components/MutationErrorToast';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/offline-sw.js').catch((error) => {
      console.warn('[Offline] Service worker registration failed:', error);
    });
  });
}

function lazyPage<T extends React.ComponentType<object>>(
  loader: () => Promise<Record<string, T>>,
  exportName: string
) {
  return React.lazy(async () => {
    const module = await loader();
    return { default: module[exportName] };
  });
}

const LoginPage = lazyPage(() => import('@/pages/Login'), 'LoginPage');
const DocumentsPage = lazyPage(() => import('@/pages/Documents'), 'DocumentsPage');
const IssuesPage = lazyPage(() => import('@/pages/Issues'), 'IssuesPage');
const ProgramsPage = lazyPage(() => import('@/pages/Programs'), 'ProgramsPage');
const SecurityToolResultsPage = lazyPage(() => import('@/pages/SecurityToolResults'), 'SecurityToolResultsPage');
const TeamModePage = lazyPage(() => import('@/pages/TeamMode'), 'TeamModePage');
const TeamDirectoryPage = lazyPage(() => import('@/pages/TeamDirectory'), 'TeamDirectoryPage');
const PersonEditorPage = lazyPage(() => import('@/pages/PersonEditor'), 'PersonEditorPage');
const FeedbackEditorPage = lazyPage(() => import('@/pages/FeedbackEditor'), 'FeedbackEditorPage');
const PublicFeedbackPage = lazyPage(() => import('@/pages/PublicFeedback'), 'PublicFeedbackPage');
const ProjectsPage = lazyPage(() => import('@/pages/Projects'), 'ProjectsPage');
const DashboardPage = lazyPage(() => import('@/pages/Dashboard'), 'DashboardPage');
const MyWeekPage = lazyPage(() => import('@/pages/MyWeekPage'), 'MyWeekPage');
const AdminDashboardPage = lazyPage(() => import('@/pages/AdminDashboard'), 'AdminDashboardPage');
const AdminWorkspaceDetailPage = lazyPage(() => import('@/pages/AdminWorkspaceDetail'), 'AdminWorkspaceDetailPage');
const WorkspaceSettingsPage = lazyPage(() => import('@/pages/WorkspaceSettings'), 'WorkspaceSettingsPage');
const ConvertedDocumentsPage = lazyPage(() => import('@/pages/ConvertedDocuments'), 'ConvertedDocumentsPage');
const UnifiedDocumentPage = lazyPage(() => import('@/pages/UnifiedDocumentPage'), 'UnifiedDocumentPage');
const StatusOverviewPage = lazyPage(() => import('@/pages/StatusOverviewPage'), 'StatusOverviewPage');
const ReviewsPage = lazyPage(() => import('@/pages/ReviewsPage'), 'ReviewsPage');
const OrgChartPage = lazyPage(() => import('@/pages/OrgChartPage'), 'OrgChartPage');
const InviteAcceptPage = lazyPage(() => import('@/pages/InviteAccept'), 'InviteAcceptPage');
const SetupPage = lazyPage(() => import('@/pages/Setup'), 'SetupPage');

function RouteFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-muted">Loading...</div>
    </div>
  );
}

/**
 * Redirect component for type-specific routes to canonical /documents/:id
 * Uses replace to ensure browser history only has one entry
 */
function DocumentRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/documents/${id}`} replace />;
}

/**
 * Redirect component for /programs/:id/* routes to /documents/:id/*
 * Preserves the tab portion of the path (issues, projects, sprints)
 */
function ProgramTabRedirect() {
  const { id, '*': splat } = useParams<{ id: string; '*': string }>();
  const tab = splat || '';
  const targetPath = tab ? `/documents/${id}/${tab}` : `/documents/${id}`;
  return <Navigate to={targetPath} replace />;
}

/**
 * Redirect component for /sprints/:id/* routes to /documents/:id/*
 * Maps old sprint sub-routes to new unified document tab routes
 */
function SprintTabRedirect({ tab }: { tab?: string }) {
  const { id } = useParams<{ id: string }>();
  // Map 'planning' to 'plan' for consistency
  const mappedTab = tab === 'planning' ? 'plan' : tab;
  // 'view' maps to root (overview tab)
  const targetPath = mappedTab && mappedTab !== 'view'
    ? `/documents/${id}/${mappedTab}`
    : `/documents/${id}`;
  return <Navigate to={targetPath} replace />;
}

function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <h1 className="text-xl font-medium text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/docs" replace />;
  }

  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/docs" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Truly public routes - no AuthProvider wrapper */}
      <Route
        path="/feedback/:programId"
        element={<PublicFeedbackPage />}
      />
      {/* Routes that need AuthProvider (even if some are public) */}
      <Route
        path="/*"
        element={
          <WorkspaceProvider>
            <AuthProvider>
              <RealtimeEventsProvider>
                <AppRoutes />
              </RealtimeEventsProvider>
            </AuthProvider>
          </WorkspaceProvider>
        }
      />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/setup"
        element={<SetupPage />}
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/invite/:token"
        element={<InviteAcceptPage />}
      />
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <AdminDashboardPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/workspaces/:id"
        element={
          <SuperAdminRoute>
            <AdminWorkspaceDetailPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <CurrentDocumentProvider>
              <ArchivedPersonsProvider>
                <DocumentsProvider>
                  <ProgramsProvider>
                    <ProjectsProvider>
                      <IssuesProvider>
                        <UploadProvider>
                          <AppLayout />
                        </UploadProvider>
                      </IssuesProvider>
                    </ProjectsProvider>
                  </ProgramsProvider>
                </DocumentsProvider>
              </ArchivedPersonsProvider>
            </CurrentDocumentProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/my-week" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my-week" element={<MyWeekPage />} />
        <Route path="docs" element={<DocumentsPage />} />
        <Route path="docs/:id" element={<DocumentRedirect />} />
        <Route path="documents/:id/*" element={<UnifiedDocumentPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="issues/:id" element={<DocumentRedirect />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<DocumentRedirect />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="programs/security" element={<SecurityToolResultsPage />} />
        <Route path="programs/:programId/sprints/:id" element={<DocumentRedirect />} />
        <Route path="programs/:id/*" element={<ProgramTabRedirect />} />
        <Route path="sprints" element={<Navigate to="/team/allocation" replace />} />
        {/* Sprint routes - redirect legacy views to /documents/:id, keep planning workflow */}
        <Route path="sprints/:id" element={<DocumentRedirect />} />
        <Route path="sprints/:id/view" element={<SprintTabRedirect tab="view" />} />
        <Route path="sprints/:id/plan" element={<SprintTabRedirect tab="plan" />} />
        <Route path="sprints/:id/planning" element={<SprintTabRedirect tab="planning" />} />
        <Route path="sprints/:id/standups" element={<SprintTabRedirect tab="standups" />} />
        <Route path="sprints/:id/review" element={<SprintTabRedirect tab="review" />} />
        <Route path="team" element={<Navigate to="/team/allocation" replace />} />
        <Route path="team/allocation" element={<TeamModePage />} />
        <Route path="team/directory" element={<TeamDirectoryPage />} />
        <Route path="team/status" element={<StatusOverviewPage />} />
        <Route path="team/reviews" element={<ReviewsPage />} />
        <Route path="team/org-chart" element={<OrgChartPage />} />
        {/* Person profile stays in Teams context - no redirect to /documents */}
        <Route path="team/:id" element={<PersonEditorPage />} />
        <Route path="feedback/:id" element={<FeedbackEditorPage />} />
        <Route path="settings" element={<WorkspaceSettingsPage />} />
        <Route path="settings/conversions" element={<ConvertedDocumentsPage />} />
      </Route>
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister }}
    >
      <ToastProvider>
        <MutationErrorToast />
        <BrowserRouter>
          <ReviewQueueProvider>
            <React.Suspense fallback={<RouteFallback />}>
              <App />
            </React.Suspense>
          </ReviewQueueProvider>
        </BrowserRouter>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
