import { WatcherData } from './watcher';

export interface ModalPortalProps {
  children: React.ReactNode;
}

export interface WalletDetailsModalProps {
  watcher: WatcherData;
  onClose: () => void;
  onUpdate: (updatedWatcher: WatcherData) => void;
}

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  title: string;
  loading?: boolean;
}

export interface AddWatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
} 