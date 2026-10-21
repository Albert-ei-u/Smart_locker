"use client";

import React from "react";
import { AlertCircle, WifiOff } from "lucide-react";

interface BannerProps {
  isLive: boolean;
  usersScraperError: boolean;
}

export function Banner({ isLive, usersScraperError }: BannerProps) {
  if (isLive && !usersScraperError) return null;

  return (
    <div className="banner-stack" role="alert">
      {!isLive && (
        <div className="status-banner banner-danger">
          <WifiOff size={17} aria-hidden="true" />
          <p>
            <strong>Offline:</strong> Cannot reach the locker server. Retrying
            connection while preserving last known status...
          </p>
        </div>
      )}

      {usersScraperError && (
        <div className="status-banner banner-warning">
          <AlertCircle size={17} aria-hidden="true" />
          <p>
            <strong>Backend parser error:</strong> Could not read the users list
            from the backend. The legacy dashboard HTML may have changed.
          </p>
        </div>
      )}
    </div>
  );
}
