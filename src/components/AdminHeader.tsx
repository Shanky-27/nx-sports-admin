"use client";

import { Bell, Menu, Search } from "lucide-react";

type AdminHeaderProps = {
  onMenuClick: () => void;
  title?: string;
};

export default function AdminHeader({
  onMenuClick,
  title = "NX SPORTS ADMIN",
}: AdminHeaderProps) {
  return (
    <header className="admin-header">
      <div className="header-left">
        <button
          type="button"
          className="header-icon-btn mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={19} />
        </button>

        <div className="hidden sm:block">
          <div className="eyebrow">CONTROL CENTER</div>
          <div className="text-sm font-semibold text-[var(--c-chrome-hi)]">
            {title}
          </div>
        </div>
      </div>

      <div className="header-right">
        <label className="header-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search anything..."
            aria-label="Search"
          />
          <span className="hidden text-xs text-[var(--c-text3)] md:block">
            /
          </span>
        </label>

        <button
          type="button"
          className="header-icon-btn"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="header-notification-dot" />
        </button>
      </div>
    </header>
  );
}