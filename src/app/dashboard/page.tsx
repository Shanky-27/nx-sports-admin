"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  ShoppingBag,
  Package,
  Users,
  ArrowUpRight,
  ArrowRight,
  Clock3,
  Truck,
  Star,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import StatCard from "@/components/StatCard";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      if (mounted) {
        setAdminEmail(data.session.user.email || "");
        setCheckingAuth(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checkingAuth) {
    return (
      <main className="loading-state">
        <div className="flex flex-col items-center gap-4">
          <div className="loading-spinner" />
          VERIFYING ADMIN SESSION...
        </div>
      </main>
    );
  }

  const recentOrders = [
    {
      id: "NX-ORD-001",
      customer: "Customer One",
      product: "NX Sports Product",
      amount: "₹2,499",
      status: "Processing",
      badge: "badge-gold",
    },
    {
      id: "NX-ORD-002",
      customer: "Customer Two",
      product: "NX Sports Product",
      amount: "₹1,899",
      status: "Delivered",
      badge: "badge-green",
    },
    {
      id: "NX-ORD-003",
      customer: "Customer Three",
      product: "NX Sports Product",
      amount: "₹3,299",
      status: "Pending",
      badge: "badge-blue",
    },
  ];

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="admin-main">
          <AdminHeader
            title="OVERVIEW"
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="admin-content">
            <section className="admin-page-header">
              <div>
                <div className="eyebrow">NX SPORTS / CONTROL CENTER</div>
                <h1 className="admin-page-title mt-2">
                  Dashboard Overview
                </h1>
                <p className="admin-page-subtitle">
                  Welcome back, {adminEmail}
                </p>
              </div>

              <div className="badge badge-green">
                SYSTEM ONLINE
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="admin-section-title">Business Snapshot</h2>
                  <p className="admin-section-desc">
                    Your store performance at a glance
                  </p>
                </div>

                <span className="eyebrow">OVERVIEW</span>
              </div>

              <div className="stats-grid">
                <StatCard
                  label="Total Revenue"
                  value="₹0"
                  change="Live data pending"
                  note=""
                  icon={IndianRupee}
                  trend="neutral"
                />

                <StatCard
                  label="Total Orders"
                  value="0"
                  change="Live data pending"
                  icon={ShoppingBag}
                  trend="neutral"
                />

                <StatCard
                  label="Total Products"
                  value="0"
                  change="Live data pending"
                  icon={Package}
                  trend="neutral"
                />

                <StatCard
                  label="Customers"
                  value="0"
                  change="Live data pending"
                  icon={Users}
                  trend="neutral"
                />
              </div>
            </section>

            <section className="admin-section">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="admin-card xl:col-span-2">
                  <div className="admin-card-header">
                    <div>
                      <h2 className="admin-card-title">Recent Orders</h2>
                      <p className="admin-card-description">
                        Latest customer order activity
                      </p>
                    </div>

                    <a
                      href="/dashboard/orders"
                      className="btn-secondary"
                    >
                      View All <ArrowUpRight size={15} />
                    </a>
                  </div>

                  <div className="table-wrap border-0 rounded-none">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Product</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id}>
                            <td className="font-mono text-blue-400">
                              {order.id}
                            </td>
                            <td>{order.customer}</td>
                            <td>{order.product}</td>
                            <td className="font-semibold">
                              {order.amount}
                            </td>
                            <td>
                              <span className={`badge ${order.badge}`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-5 py-4 border-t border-[var(--c-border)]">
                    <p className="text-xs text-[var(--c-text3)]">
                      Sample layout only. Connect live order data before
                      using these figures.
                    </p>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h2 className="admin-card-title">Quick Actions</h2>
                      <p className="admin-card-description">
                        Frequently used sections
                      </p>
                    </div>
                  </div>

                  <div className="admin-card-body flex flex-col gap-3">
                    {[
                      {
                        title: "Manage Orders",
                        description: "View and process orders",
                        icon: ShoppingBag,
                        href: "/dashboard/orders",
                      },
                      {
                        title: "Shipping Control",
                        description: "Track customer shipments",
                        icon: Truck,
                        href: "/dashboard/shipping",
                      },
                      {
                        title: "Product Inventory",
                        description: "Manage store products",
                        icon: Package,
                        href: "/dashboard/products",
                      },
                      {
                        title: "Review Moderation",
                        description: "Manage customer reviews",
                        icon: Star,
                        href: "/dashboard/reviews",
                      },
                    ].map((action) => {
                      const Icon = action.icon;

                      return (
                        <a
                          href={action.href}
                          key={action.title}
                          className="flex items-center gap-3 p-3 bg-[var(--c-surface2)] border border-[var(--c-border)] rounded-sm hover:border-[var(--c-border-hi)] transition-all"
                        >
                          <div className="stat-card-icon">
                            <Icon size={17} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[var(--c-chrome)]">
                              {action.title}
                            </div>
                            <div className="text-xs text-[var(--c-text2)]">
                              {action.description}
                            </div>
                          </div>

                          <ArrowRight
                            size={15}
                            className="text-[var(--c-text3)]"
                          />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-section">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="stat-card-icon">
                      <Clock3 size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--c-chrome)]">
                        Pending Orders
                      </div>
                      <div className="text-xs text-[var(--c-text2)]">
                        Awaiting processing
                      </div>
                    </div>
                  </div>
                  <div className="stat-card-value">0</div>
                </div>

                <div className="admin-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="stat-card-icon">
                      <Truck size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--c-chrome)]">
                        Shipments
                      </div>
                      <div className="text-xs text-[var(--c-text2)]">
                        Currently in transit
                      </div>
                    </div>
                  </div>
                  <div className="stat-card-value">0</div>
                </div>

                <div className="admin-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="stat-card-icon">
                      <Star size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--c-chrome)]">
                        Reviews
                      </div>
                      <div className="text-xs text-[var(--c-text2)]">
                        Awaiting moderation
                      </div>
                    </div>
                  </div>
                  <div className="stat-card-value">0</div>
                </div>
              </div>
            </section>

            <div className="mt-10 pt-5 border-t border-[var(--c-border)] flex flex-wrap justify-between gap-3">
              <span className="eyebrow">
                NX SPORTS ADMINISTRATION
              </span>
              <span className="text-xs text-[var(--c-text3)]">
                Dashboard UI Preview
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}