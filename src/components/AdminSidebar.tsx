
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Package,
  Star,
  Wallet,
  ChartNoAxesCombined,
  Users,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const LOGO_URL =
  "https://vhjphwsbneabpsoxyxti.supabase.co/storage/v1/object/public/logos/ll.png";

const navigation = [
  {
    label: "MAIN MENU",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { name: "Shipping", href: "/dashboard/shipping", icon: Truck },
      { name: "Products", href: "/dashboard/products", icon: Package },
      { name: "Reviews", href: "/dashboard/reviews", icon: Star },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { name: "Finance", href: "/dashboard/finance", icon: Wallet },
      { name: "Analytics", href: "/dashboard/analytics", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { name: "Team & Permissions", href: "/dashboard/team", icon: Users },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function AdminSidebar({
  isOpen,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[900] bg-black/70 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`admin-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Image
              src={LOGO_URL}
              alt="NX Sports Logo"
              width={48}
              height={48}
              priority
              unoptimized
            />
          </div>

          <div>
            <div className="sidebar-brand-name">NX SPORTS</div>
            <div className="sidebar-brand-label">ADMIN CONTROL</div>
          </div>

          <button
            type="button"
            className="btn-icon ml-auto lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((group) => (
            <div key={group.label}>
              <div className="sidebar-label">{group.label}</div>

              {group.items.map((item) => {
                const Icon = item.icon;

                const active =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`sidebar-link ${active ? "active" : ""}`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">NX</div>

            <div className="min-w-0 flex-1">
              <div className="sidebar-user-name">NX Admin</div>
              <div className="sidebar-user-role">Administrator</div>
            </div>

            <button
              type="button"
              className="btn-icon"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
