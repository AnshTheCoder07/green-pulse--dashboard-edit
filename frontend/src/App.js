// frontend/src/App.js
import './assets/css/App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/auth';
import AdminLayout from './layouts/admin';
import { ChakraProvider } from '@chakra-ui/react';
import initialTheme from './theme/theme';
import { useState, useEffect } from 'react';
import { CarbonProvider } from './contexts/CarbonContext';
import { InstituteProvider } from './contexts/InstituteContext';
import { DepartmentProvider } from './contexts/DepartmentContext';
import { AuthProvider } from './contexts/AuthContext'; // Add this import
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/loading_screen/LoadingScreen';

export default function Main() {
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing Green Pulse Dashboard...");
  
  useEffect(() => {
    // Simulate loading process with progress updates
    const loadingSteps = [
      { progress: 20, message: "Loading blockchain services..." },
      { progress: 40, message: "Connecting to energy oracle..." },
      { progress: 60, message: "Initializing carbon tracking..." },
      { progress: 80, message: "Setting up dashboard components..." },
      { progress: 100, message: "Welcome to Green Pulse Dashboard!" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setLoadingProgress(loadingSteps[currentStep].progress);
        setLoadingMessage(loadingSteps[currentStep].message);
        currentStep++;
      } else {
        clearInterval(interval);
        // Add a small delay before hiding loading screen
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);
  
  return (
    <ErrorBoundary>
      <ChakraProvider theme={currentTheme || initialTheme}>
        <AuthProvider> {/* Wrap with AuthProvider */}
          <InstituteProvider>
            <DepartmentProvider>
              <CarbonProvider>
                {isLoading && (
                  <LoadingScreen 
                    loading={isLoading}
                    progress={loadingProgress}
                    message={loadingMessage}
                  />
                )}
                <Routes>
                  <Route path="auth/*" element={<AuthLayout />} />
                  <Route
                    path="admin/*"
                    element={
                      <AdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                    }
                  />
                  <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />
                </Routes>
              </CarbonProvider>
            </DepartmentProvider>
          </InstituteProvider>
        </AuthProvider> {/* Close AuthProvider */}
      </ChakraProvider>
    </ErrorBoundary>
  );
}