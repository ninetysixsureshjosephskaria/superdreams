import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'destructive';
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Render as a bottom sheet on small screens (see Modal). */
  mobileSheet?: boolean;
}

/**
 * Presentational confirmation dialog built on Modal. Callers own the state and
 * supply the confirm/cancel handlers.
 */
export function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isConfirming = false,
  onConfirm,
  onCancel,
  mobileSheet = false,
}: ConfirmationDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={description}
      mobileSheet={mobileSheet}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isConfirming}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
