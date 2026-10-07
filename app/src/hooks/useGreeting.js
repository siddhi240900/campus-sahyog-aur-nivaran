import { useEffect, useState } from 'react';
import { greetingForHour } from '../lib/format';

const REFRESH_MS = 60 * 1000;

// The greeting for the device's local time. It re-checks every minute, so a dashboard left open
// changes from morning to afternoon to evening by itself.
export function useGreeting() {
  const [greeting, setGreeting] = useState(() => greetingForHour(new Date().getHours()));
  useEffect(() => {
    const timer = setInterval(() => setGreeting(greetingForHour(new Date().getHours())), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  return greeting;
}
