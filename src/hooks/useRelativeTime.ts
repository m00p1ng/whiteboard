import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const UPDATE_INTERVAL_MS = 60_000;

export function useRelativeTime(timestamp: number): string {
  const [, setCurrentTime] = useState(Date.now);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return formatDistanceToNow(timestamp, { addSuffix: true });
}
