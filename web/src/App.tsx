import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { isLoggedIn } from './lib/auth'
import { LoginPage } from './pages/LoginPage'
import { CollectionsPage } from './pages/CollectionsPage'
import { CollectionDetailPage } from './pages/CollectionDetailPage'
import { DocumentEditorPage } from './pages/DocumentEditorPage'
import { ChatPage } from './pages/ChatPage'
import { PreviewPage } from './pages/PreviewPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn() ? <Navigate to="/collections" replace /> : <LoginPage />}
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:id" element={<CollectionDetailPage />} />
            <Route path="/collections/:id/documents/new" element={<DocumentEditorPage />} />
            <Route path="/collections/:id/documents/:docId" element={<DocumentEditorPage />} />
            <Route path="/collections/:id/chat" element={<ChatPage />} />
            <Route path="/collections/:id/preview/:chunkId" element={<PreviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/collections" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
