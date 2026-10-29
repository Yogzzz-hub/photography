import { useState, useEffect, lazy, Suspense } from 'react';
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
const BulkUploadModal = lazy(() => import('./components/upload/BulkUploadModal').then((m) => ({ default: m.BulkUploadModal })));
const PhotoDetailModal = lazy(() => import('./components/media/PhotoDetailModal').then((m) => ({ default: m.PhotoDetailModal })));
const SlideshowModal = lazy(() => import('./components/media/SlideshowModal').then((m) => ({ default: m.SlideshowModal })));
const LockUnlockModal = lazy(() => import('./components/layout/LockUnlockModal').then((m) => ({ default: m.LockUnlockModal })));

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

  // Auto-initialize vault cryptographic key in demo mode for instant seamless experience
  useEffect(() => {
    if (!isVaultUnlocked) {
      generateMasterVaultKey().then((key) => {
        unlockWithMasterKey(key);
      });
    }
  }, [isVaultUnlocked, unlockWithMasterKey]);

  const isUniverse = currentTab === 'universe';

  return (
    <div className="relative min-h-screen bg-vault-void text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* Top Navbar (displayed on 2D and administrative views) */}
      {!isUniverse && (
        <div className="sticky top-0 z-40">
          <Navbar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenLockModal={() => setIsLockModalOpen(true)}
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
            />
          )}

          {currentTab === 'library' && (
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
              <Fallback2DGallery
                photos={photos}
                onSelectPhoto={(id) => setSelectedPhotoId(id)}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          )}

          {currentTab === 'map' && (
            <div className="flex-1 w-full h-[calc(100vh-80px)] p-4 sm:p-6">
              <MemoryMap onOpenPhotoDetail={(id) => setSelectedPhotoId(id)} />
            </div>
          )}

          {currentTab === 'albums' && (
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
              <AlbumsView onSelectAlbum={() => setCurrentTab('universe')} />
            </div>
          )}

          {currentTab === 'storage' && (
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
              <StorageDashboard />
            </div>
          )}

          {currentTab === 'activity' && (
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
              <ActivityHistory />
            </div>
          )}

          {currentTab === 'members' && (
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
              <FamilyManagement />
            </div>
          )}

          {currentTab === 'backups' && (
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
              <BackupCenter />
            </div>
          )}
        </Suspense>
      </main>

      {/* Global Interactive Modals */}
      <Suspense fallback={null}>
        <BulkUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
        <PhotoDetailModal photoId={selectedPhotoId} onClose={() => setSelectedPhotoId(null)} />
        <SlideshowModal isOpen={isSlideshowActive} onClose={() => setIsSlideshowActive(false)} />
        <LockUnlockModal isOpen={isLockModalOpen} onClose={() => setIsLockModalOpen(false)} />
      </Suspense>
    </div>
  );
}

export default App;
