import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import type { Portal } from './auth/authTypes'
import Landing from './pages/Landing'
import FamilyDashboard from './pages/family/FamilyDashboard'
import ReportMissing from './pages/family/ReportMissing'
import ReliefDashboard from './pages/relief/ReliefDashboard'
import SearcherLogin from './pages/searcher/SearcherLogin'
import SearcherRegister from './pages/searcher/SearcherRegister'
import SearcherDashboard from './pages/searcher/SearcherDashboard'
import SearcherCases from './pages/searcher/SearcherCases'
import FinderLogin from './pages/finder/FinderLogin'
import FinderOrganizationRegister from './pages/finder/FinderOrganizationRegister'
import FinderDashboard from './pages/finder/FinderDashboard'
import FinderProfile from './pages/finder/FinderProfile'
import FinderRegister from './pages/finder/FinderRegister'
import FinderRecords from './pages/finder/FinderRecords'
import FinderMatches from './pages/finder/FinderMatches'
import FinderVerification from './pages/finder/FinderVerification'
import FinderCaseUpdates from './pages/finder/FinderCaseUpdates'
import AIMatch from './pages/matching/AIMatch'
import CommandCenter from './pages/command/CommandCenter'
import CommandCenterLogin from './pages/command/CommandCenterLogin'
import CaseTimelinePage from './pages/cases/CaseTimelinePage'
import Notifications from './pages/notifications/Notifications'
import Offline from './pages/Offline'
import Privacy from './pages/Privacy'
import LogoutPage from './pages/LogoutPage'
import PagePlaceholder from './components/common/PagePlaceholder'
import LoadingState from './components/common/LoadingState'

function portalHome(portal: Portal) {
  return portal === 'command_center' ? '/command' : `/${portal}`
}

function portalLogin(portal: Portal) {
  return portal === 'command_center' ? '/command/login' : `/${portal}/login`
}

function PortalEntry() {
  const { session, isLoading } = useAuth()
  if (isLoading) return <LoadingState label="Verifying session" />
  if (session) return <Navigate replace to={portalHome(session.portal)} />
  return <Landing />
}

function PortalLogin({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  if (isLoading) return <LoadingState label="Verifying session" />
  if (session) return <Navigate replace to={portalHome(session.portal)} />
  return <>{children}</>
}

function PortalGuard({
  portal,
  children,
}: {
  portal: Portal
  children: ReactNode
}) {
  const { session, isLoading } = useAuth()
  if (isLoading) return <LoadingState label="Verifying session" />
  if (!session) return <Navigate replace to={portalLogin(portal)} />
  if (session.portal !== portal) return <Navigate replace to={portalHome(session.portal)} />
  return <>{children}</>
}

function AuthenticatedGuard({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  if (isLoading) return <LoadingState label="Verifying session" />
  if (!session) return <Navigate replace to="/" />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<PortalEntry />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route
        path="/searcher/login"
        element={<PortalLogin><SearcherLogin /></PortalLogin>}
      />
      <Route path="/searcher/register" element={<SearcherRegister />} />
      <Route
        path="/searcher"
        element={<PortalGuard portal="searcher"><SearcherDashboard /></PortalGuard>}
      />
      <Route
        path="/searcher/cases"
        element={<PortalGuard portal="searcher"><SearcherCases /></PortalGuard>}
      />
      <Route
        path="/finder/login"
        element={<PortalLogin><FinderLogin /></PortalLogin>}
      />
      <Route
        path="/command/login"
        element={<PortalLogin><CommandCenterLogin /></PortalLogin>}
      />
      <Route path="/finder/register-organization" element={<FinderOrganizationRegister />} />
      <Route
        path="/finder"
        element={<PortalGuard portal="finder"><FinderDashboard /></PortalGuard>}
      />
      <Route
        path="/finder/profile"
        element={<PortalGuard portal="finder"><FinderProfile /></PortalGuard>}
      />
      <Route
        path="/finder/register"
        element={<PortalGuard portal="finder"><FinderRegister /></PortalGuard>}
      />
      <Route
        path="/finder/records"
        element={<PortalGuard portal="finder"><FinderRecords /></PortalGuard>}
      />
      <Route
        path="/finder/matches"
        element={<PortalGuard portal="finder"><FinderMatches /></PortalGuard>}
      />
      <Route
        path="/finder/verification"
        element={<PortalGuard portal="finder"><FinderVerification /></PortalGuard>}
      />
      <Route
        path="/finder/updates"
        element={<PortalGuard portal="finder"><FinderCaseUpdates /></PortalGuard>}
      />
      <Route
        path="/finder/notifications"
        element={<PortalGuard portal="finder"><Notifications /></PortalGuard>}
      />
      <Route
        path="/family"
        element={<PortalGuard portal="searcher"><FamilyDashboard /></PortalGuard>}
      />
      <Route
        path="/family/report"
        element={<PortalGuard portal="searcher"><ReportMissing /></PortalGuard>}
      />
      <Route
        path="/relief"
        element={<PortalGuard portal="finder"><ReliefDashboard /></PortalGuard>}
      />
      <Route
        path="/match/SH-2026-00124"
        element={<PortalGuard portal="finder"><AIMatch /></PortalGuard>}
      />
      <Route
        path="/command"
        element={<PortalGuard portal="command_center"><CommandCenter /></PortalGuard>}
      />
      <Route
        path="/timeline/:caseId"
        element={<PortalGuard portal="searcher"><CaseTimelinePage /></PortalGuard>}
      />
      <Route
        path="/notifications"
        element={<AuthenticatedGuard><Notifications /></AuthenticatedGuard>}
      />
      <Route path="/offline" element={<Offline />} />
      <Route
        path="/privacy"
        element={<PortalGuard portal="searcher"><Privacy /></PortalGuard>}
      />
      <Route
        path="*"
        element={
          <PagePlaceholder
            title="Page not found"
            description="We couldn't find that page. Return home to continue using Sahayaa."
          />
        }
      />
    </Routes>
  )
}

export default App
