import { useEffect } from 'react';
import { useVaultStore } from '@/store/useVaultStore';

export function useAutoLock() {
    const { touchActivity, checkAutoLock } = useVaultStore();

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        const handleActivity = () => {
            touchActivity();
        };

        // Throttle activity updates? For now, direct call is fine as state update is fast
        events.forEach(event => window.addEventListener(event, handleActivity));
        
        const interval = setInterval(() => {
            checkAutoLock();
        }, 10000); // Check every 10 seconds

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            clearInterval(interval);
        };
    }, [touchActivity, checkAutoLock]);
}
