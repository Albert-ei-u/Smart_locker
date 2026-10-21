"use client";

import React from "react";
import { AlertCircle, WifiOff } from "lucide-react";

interface BannerProps {
  isLive: boolean;
  usersError: boolean;
}

export function Banner({ isLive, usersError }: BannerProps) {
  if (isLive && !usersError) return null;

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

      {usersError && (
        <div className="status-banner banner-warning">
          <AlertCircle size={17} aria-hidden="true" />
          <p>
            <strong>Users unavailable:</strong> Could not load the users list
            from the locker server. Retrying automatically...
          </p>
        </div>
      )}
    </div>
  );
}
