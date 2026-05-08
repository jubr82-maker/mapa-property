"use client";

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("fr-LU", {
  timeZone: "Europe/Luxembourg",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function LiveClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState<string>("--:--");

  useEffect(() => {
    const tick = () => setTime(formatter.format(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return <span className={className}>{time}</span>;
}
