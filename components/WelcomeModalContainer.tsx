"use client";

import { useWelcomeAnnouncement } from "@/hooks/useWelcomeAnnouncement";
import { WelcomeAnnouncementModal } from "@/components/modals/WelcomeAnnouncementModal";

export function WelcomeModalContainer() {
    const { isOpen, loading, config, handleClose } = useWelcomeAnnouncement();

    if (!config && !loading) return null;

    return (
        <WelcomeAnnouncementModal
            isOpen={isOpen}
            onClose={handleClose}
            config={config}
            isLoading={loading}
        />
    );
}
