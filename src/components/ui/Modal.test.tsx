import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal keyboard lifecycle', () => {
    it('names the dialog, traps Tab, dismisses Escape and restores focus', () => {
        const trigger = document.createElement('button');
        document.body.append(trigger);
        trigger.focus();
        const onClose = vi.fn();
        const { rerender, unmount } = render(
            <Modal isOpen onClose={onClose} title="Account"><input aria-label="Name" /><button>Save</button></Modal>
        );
        const dialog = screen.getByRole('dialog', { name: 'Account' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        const close = screen.getByRole('button', { name: 'common.close' });
        const save = screen.getByRole('button', { name: 'Save' });
        expect(close).toHaveFocus();
        fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
        expect(save).toHaveFocus();
        fireEvent.keyDown(save, { key: 'Tab' });
        expect(close).toHaveFocus();
        trigger.focus();
        expect(close).toHaveFocus();
        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
        rerender(<Modal isOpen={false} onClose={onClose} title="Account">Closed</Modal>);
        expect(trigger).toHaveFocus();
        expect(document.body.style.overflow).toBe('');
        unmount();
        trigger.remove();
    });

    it('keeps required onboarding open and focuses an otherwise empty dialog', () => {
        const onClose = vi.fn();
        const { unmount } = render(<Modal isOpen onClose={onClose} title="Required" hideCloseButton>Choose a name</Modal>);
        const dialog = screen.getByRole('dialog', { name: 'Required' });
        expect(dialog).toHaveFocus();
        fireEvent.keyDown(dialog, { key: 'Escape' });
        fireEvent.keyDown(dialog, { key: 'Tab' });
        expect(onClose).not.toHaveBeenCalled();
        expect(dialog).toHaveFocus();
        unmount();
    });

    it('only handles Escape on the topmost nested modal and unlocks scroll at the end', () => {
        const outer = vi.fn();
        const inner = vi.fn();
        const { unmount } = render(<Modal isOpen title="Outer" onClose={outer}>
            <Modal isOpen title="Inner" onClose={inner}><button>Confirm</button></Modal>
        </Modal>);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(inner).toHaveBeenCalledOnce();
        expect(outer).not.toHaveBeenCalled();
        expect(document.body.style.overflow).toBe('hidden');
        unmount();
        expect(document.body.style.overflow).toBe('');
    });
});
