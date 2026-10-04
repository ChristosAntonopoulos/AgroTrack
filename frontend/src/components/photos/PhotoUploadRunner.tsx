import { useEffect } from 'react';
import { photoUploadQueue } from './photoUploadQueue';

/** Keeps the photo queue moving after the library page is closed, and when the device reconnects. */
const PhotoUploadRunner: React.FC = () => {
  useEffect(() => {
    const queue = photoUploadQueue();
    void queue.hydrate().then(() => queue.pump());
    const onOnline = () => queue.pump();
    const onOffline = () => queue.markOffline();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return null;
};

export default PhotoUploadRunner;
