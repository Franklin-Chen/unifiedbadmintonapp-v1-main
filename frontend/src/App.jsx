import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GroupDetailPage from './pages/GroupDetailPage';
import CreateGroupPage from './pages/CreateGroupPage';
import EditGroupPage from './pages/EditGroupPage';
import FindOpenGroupsPage from './pages/FindOpenGroupsPage';
import JoinPrivateGroupPage from './pages/JoinPrivateGroupPage';
import CreateEventPage from './pages/CreateEventPage';
import EventDetailPage from './pages/EventDetailPage';
import EditEventPage from './pages/EditEventPage';
import MyRegistrationsPage from './pages/MyRegistrationsPage'; // Renamed for clarity
// Import Components
import Navbar from './components/Layout/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholder for pages not yet implemented
const PlaceholderPage = ({ title }) => <div className="container mx-auto p-4"><h1 className="text-2xl">{title} - Coming Soon</h1></div>;

// Helper component to handle initial redirect based on auth status
const AuthRedirector = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>; // Or a spinner
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};


function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow bg-gray-50 pt-4 pb-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={
                <AuthRedirector>
                  <Navigate to="/dashboard" replace />
                </AuthRedirector>
              } />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/groups" element={<DashboardPage />} />
                <Route path="/groups/create" element={<CreateGroupPage />} />
                <Route path="/groups/open" element={<FindOpenGroupsPage />} />
                <Route path="/groups/join" element={<JoinPrivateGroupPage />} />
                <Route path="/groups/:groupId" element={<GroupDetailPage />} />
                <Route path="/groups/:groupId/create-event" element={<CreateEventPage />} />
                <Route path="/groups/:groupId/edit" element={<EditGroupPage />} />

                <Route path="/events/:eventId" element={<EventDetailPage />} />
                <Route path="/events/:eventId/edit" element={<EditEventPage />} />

                {/* ***** Use updated page name ***** */}
                <Route path="/my-registrations" element={<MyRegistrationsPage />} />
                <Route path="/profile" element={<PlaceholderPage title="My Profile" />} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>

            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;