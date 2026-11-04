import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useVaultStore } from './stores/useVaultStore';
import { Navbar, type NavigationTab } from './components/layout/Navbar';
import { MemoryUniverse } from './components/3d/MemoryUniverse';
import { generateMasterVaultKey } from './crypto/vaultCrypto';

// Dynamically code-split heavy chunks for lightning-fast initial load times (< 300ms)
const MemoryMap = lazy(() => import('./components/map/MemoryMap').then((m) => ({ default: m.MemoryMap })));
const Fallback2DGallery = lazy(() => import('./components/3d/Fallback2DGallery').then((m) => ({ default: m.Fallback2DGallery })));
const AlbumsView = lazy(() => import('./components/layout/AlbumsView').then((m) => ({ default: m.AlbumsView })));
const StorageDashboard = lazy(() => import('./components/admin/StorageDashboard').then((m) => ({ default: m.StorageDashboard })));
const ActivityHistory = lazy(() => import('./components/admin/ActivityHistory').then((m) => ({ default: m.ActivityHistory })));
const FamilyManagement = lazy(() => import('./components/admin/FamilyManagement').then((m) => ({ default: m.FamilyManagement })));
const BackupCenter = lazy(() => import('./components/admin/BackupCenter').then((m) => ({ default: m.BackupCenter })));
import { BulkUploadModal } from './components/upload/BulkUploadModal';
import { PhotoDetailModal } from './components/media/PhotoDetailModal';
import { SlideshowModal } from './components/media/SlideshowModal';
import { VaultLoginModal } from './components/auth/VaultLoginModal';
import { JoinVaultModal } from './components/auth/JoinVaultModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { extractAndNormalizeInviteCode } from './utils/inviteUtils';

const ViewLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] text-vault-gold font-sans text-xs tracking-widest uppercase animate-pulse gap-2">
    <div className="w-6 h-6 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
    <span>Loading Vault Module...</span>
  </div>
);

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('universe');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [incomingInviteCode, setIncomingInviteCode] = useState<string>('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const {
    photos,
    selectedPhotoId,
    setSelectedPhotoId,
    isSlideshowActive,
    setIsSlideshowActive,
    toggleFavorite,
    isVaultUnlocked,
    unlockWithMasterKey,
  } = useVaultStore();

  const hasInitializedRef = useRef(false);

  // Auto-initialize vault cryptographic key on initial mount for instant seamless experience
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (!isVaultUnlocked) {
        generateMasterVaultKey().then((key) => {
          unlockWithMasterKey(key);
        });
      }
    }
  }, [isVaultUnlocked, unlockWithMasterKey]);

  // Intercept invitation codes from URL (?code=... / ?invite=... / /join?code=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const codeFromSearch = searchParams.get('code') || searchParams.get('invite');

      let detectedCode = codeFromSearch;

      // Also check sessionStorage in case user arrived via /join/index.html redirect
      if (!detectedCode) {
        const storedCode = sessionStorage.getItem('myorb_pending_invite_code');
        if (storedCode) {
          detectedCode = storedCode;
          sessionStorage.removeItem('myorb_pending_invite_code');
        }
      }

      // Also check hash fragment e.g. #/join?code=...
      if (!detectedCode && window.location.hash.includes('code=')) {
        const hashMatch = window.location.hash.match(/(?:code|invite)=([A-Za-z0-9_\-]+)/i);
        if (hashMatch && hashMatch[1]) {
          detectedCode = hashMatch[1];
        }
      }

      // Check path /join or /join/:code
      if (!detectedCode && window.location.pathname.includes('/join')) {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && lastSegment !== 'join' && !lastSegment.includes('?')) {
          detectedCode = lastSegment;
        }
      }

      if (detectedCode) {
        const normalized = extractAndNormalizeInviteCode(detectedCode);
        if (normalized) {
          setIncomingInviteCode(normalized);
          setIsJoinModalOpen(true);
        }
      } else if (window.location.pathname === '/join' || window.location.pathname.startsWith('/join/')) {
        setIsJoinModalOpen(true);
      }
    } catch (e) {
      console.warn('Could not parse incoming invitation parameters:', e);
    }
  }, []);

  const isUniverse = currentTab === 'universe';

  return (
    <div className="relative min-h-screen bg-[#F6F5F0] text-slate-900 dark:bg-vault-void dark:text-slate-100 transition-colors duration-300 flex flex-col font-sans overflow-x-hidden">
      {/* Top Navbar (displayed on 2D and administrative views) */}
      {!isUniverse && (
        <div className="sticky top-0 z-40">
          <Navbar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenLockModal={() => setIsLockModalOpen(true)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className={isUniverse ? '' : 'flex-1 pt-2'}>
        <Suspense fallback={<ViewLoader />}>
          {currentTab === 'universe' && (
            <MemoryUniverse
              onOpenPhotoDetail={(id) => setSelectedPhotoId(id)}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenLockModal={() => setIsLockModalOpen(true)}
              onOpenProfile={() => setIsProfileModalOpen(true)}
            />
          )}

          {currentTab === 'library' && (
            <div className="max-w-7xl mx-auto w-full px-2 sm:px-6 py-3 sm:py-6">
              <Fallback2DGallery
                photos={photos}
                onSelectPhoto={(id) => setSelectedPhotoId(id)}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          )}

          {currentTab === 'map' && (
            <div className="flex-1 w-full h-[calc(100vh-56px)] sm:h-[calc(100vh-80px)] p-1.5 sm:p-6">
              <MemoryMap onOpenPhotoDetail={(id) => setSelectedPhotoId(id)} />
            </div>
          )}

          {currentTab === 'albums' && (
            <div className="max-w-7xl mx-auto w-full px-2.5 sm:px-6 py-3 sm:py-6">
              <AlbumsView onSelectAlbum={() => setCurrentTab('universe')} />
            </div>
          )}

          {currentTab === 'storage' && (
            <div className="max-w-7xl mx-auto w-full px-2.5 sm:px-6 py-3 sm:py-6">
              <StorageDashboard />
            </div>
          )}

          {currentTab === 'activity' && (
            <div className="max-w-7xl mx-auto w-full px-2.5 sm:px-6 py-3 sm:py-6">
              <ActivityHistory />
            </div>
          )}

          {currentTab === 'members' && (
            <div className="max-w-7xl mx-auto w-full px-2.5 sm:px-6 py-3 sm:py-6">
              <FamilyManagement />
            </div>
          )}

          {currentTab === 'backups' && (
            <div className="max-w-7xl mx-auto w-full px-2.5 sm:px-6 py-3 sm:py-6">
              <BackupCenter />
            </div>
          )}
        </Suspense>
      </main>

      {/* Global Interactive Modals */}
      <Suspense fallback={null}>
        <BulkUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onViewUniverse={() => {
            setIsUploadOpen(false);
            setCurrentTab('universe');
          }}
        />
        <PhotoDetailModal photoId={selectedPhotoId} onClose={() => setSelectedPhotoId(null)} />
        <SlideshowModal isOpen={isSlideshowActive} onClose={() => setIsSlideshowActive(false)} />
        <VaultLoginModal isOpen={isLockModalOpen} onClose={() => setIsLockModalOpen(false)} />
        <JoinVaultModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          inviteCode={incomingInviteCode}
          onSuccess={() => {
            setCurrentTab('universe');
          }}
        />
        <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      </Suspense>
    </div>
  );
}

export default App;
