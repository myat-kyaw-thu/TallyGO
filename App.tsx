import { LinkingService } from '@/services/linking';
import React, { useEffect } from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { backgroundTaskManager } from './src/services/backgroundTaskManager';

function AppContent() {
  useEffect(() => {
    // Initialize background tasks when app starts
    const initializeBackgroundTasks = async () => {
      try {
        await backgroundTaskManager.initialize();
        console.log('Background tasks initialized');
      } catch (error) {
        console.error('Failed to initialize background tasks:', error);
      }
    };

    // Initialize deep linking
    const linkingService = LinkingService.getInstance();
    const linkingCleanup = linkingService.initialize();

    initializeBackgroundTasks();

    // Cleanup on unmount
    return () => {
      backgroundTaskManager.cleanup();
      if (linkingCleanup) {
        linkingCleanup();
      }
    };
  }, []);

  return <AppNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}