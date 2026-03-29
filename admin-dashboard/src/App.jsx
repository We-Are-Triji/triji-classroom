import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Download from './pages/Download';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Announcements from './pages/Announcements';
import Reports from './pages/Reports';
import Users from './pages/Users';
import FreedomWall from './pages/FreedomWall';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3200,
            style: {
              background: '#fff5d6',
              color: '#1f1a17',
              border: '3px solid #1f1a17',
              borderRadius: '20px',
              boxShadow: '6px 6px 0 #1f1a17',
            },
            success: {
              iconTheme: {
                primary: '#6a994e',
                secondary: '#fff5d6',
              },
            },
            error: {
              iconTheme: {
                primary: '#d64545',
                secondary: '#fff5d6',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Download />} />
          <Route path="/admin" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="freedom-wall" element={<FreedomWall />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
