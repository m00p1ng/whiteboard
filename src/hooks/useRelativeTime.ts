import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const UPDATE_INTERVAL_MS = 60_000;

export function useRelativeTime(timestamp: number): string {
  const [relative, setRelative] = useState(() =>
    formatDistanceToNow(timestamp, { addSuffix: true })
  );

  useEffect(() => {
    setRelative(formatDistanceToNow(timestamp, { addSuffix: true }));

    const intervalId = setInterval(() => {
      setRelative(formatDistanceToNow(timestamp, { addSuffix: true }));
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [timestamp]);

  return relative;
}
