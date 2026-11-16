
"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Package, Truck, IndianRupee } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  order_reference: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_mobile: string | null;
  invoice_value: number | string | null;
  payment_mode: string | null;
  carrier: string | null;
  service_type: string | null;
  status: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  awb: string | null;
  created_at: string;
  delivered_at: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function OrdersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0
  });
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error("Backend API URL is not configured.");
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        search,
        payment_status: paymentStatus,
        delivery_status: deliveryStatus
      });

      const response = await fetch(
        `${apiUrl}/admin/orders?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json"
          },
          cache: "no-store"
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to fetch orders.");
      }

      setOrders(result.orders || []);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [search, paymentStatus, deliveryStatus]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const formatAmount = (value: Order["invoice_value"]) => {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? `₹${amount.toLocaleString("en-IN")}`
      : "—";
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  const statusClass = (value: string | null) => {
    const status = (value || "").toLowerCase();

    if (["paid", "delivered", "success", "completed"].includes(status))
      return "badge badge-green";

    if (["pending", "processing", "in transit", "shipped"].includes(status))
      return "badge badge-gold";

    if (["failed", "cancelled", "returned"].includes(status))
      return "badge badge-red";

    return "badge badge-blue";
  };

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="admin-main">
          <AdminHeader
            title="ORDERS"
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="admin-content">
            <section className="admin-page-header">
              <div>
                <div className="eyebrow">NX SPORTS / COMMERCE</div>
                <h1 className="admin-page-title mt-2">Order Management</h1>
                <p className="admin-page-subtitle">
                  Monitor customer orders, payments and shipments.
                </p>
              </div>

              <button
                onClick={() => fetchOrders(pagination.page)}
                disabled={loading}
                className="btn-secondary"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </section>

            <section className="stats-grid mb-6">
              <div className="admin-card p-5">
                <div className="flex items-center gap-3">
                  <div className="stat-card-icon"><Package size={18} /></div>
                  <span className="text-sm text-[var(--c-text2)]">Total Orders</span>
                </div>
                <div className="stat-card-value">{pagination.total}</div>
              </div>

              <div className="admin-card p-5">
                <div className="flex items-center gap-3">
                  <div className="stat-card-icon"><IndianRupee size={18} /></div>
                  <span className="text-sm text-[var(--c-text2)]">Orders Loaded</span>
                </div>
                <div className="stat-card-value">{orders.length}</div>
              </div>

              <div className="admin-card p-5">
                <div className="flex items-center gap-3">
                  <div className="stat-card-icon"><Truck size={18} /></div>
                  <span className="text-sm text-[var(--c-text2)]">Current Page</span>
                </div>
                <div className="stat-card-value">
                  {pagination.totalPages ? `${pagination.page} / ${pagination.totalPages}` : "0"}
                </div>
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">All Orders</h2>
                  <p className="admin-card-description">
                    Search and filter your store orders
                  </p>
                </div>
              </div>

              <div className="admin-card-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text2)]"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search order or customer..."
                      className="admin-input w-full pl-10"
                    />
                  </div>

                  <input
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    placeholder="Payment status (exact value)"
                    className="admin-input w-full"
                  />

                  <input
                    value={deliveryStatus}
                    onChange={(e) => setDeliveryStatus(e.target.value)}
                    placeholder="Delivery status (exact value)"
                    className="admin-input w-full"
                  />
                </div>
              </div>

              {error && (
                <div className="px-5 py-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order Reference</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Delivery</th>
                      <th>AWB</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12">
                          Loading orders...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12">
                          {error ? "Unable to load orders." : "No orders found."}
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td className="font-mono text-blue-400">
  <a
    href={`/dashboard/orders/${order.id}`}
    className="hover:text-blue-300 hover:underline"
  >
    {order.order_reference || order.id.slice(0, 8)}
  </a>
</td>
                          <td>
                            <div className="font-semibold">
                              {order.customer_name || "Unknown"}
                            </div>
                            <div className="text-xs text-[var(--c-text2)]">
                              {order.customer_email || order.customer_mobile || "—"}
                            </div>
                          </td>
                          <td>{formatDate(order.created_at)}</td>
                          <td className="font-semibold">
                            {formatAmount(order.invoice_value)}
                          </td>
                          <td>
                            <span className={statusClass(order.payment_status)}>
                              {order.payment_status || "Unknown"}
                            </span>
                          </td>
                          <td>
                            <span className={statusClass(order.delivery_status)}>
                              {order.delivery_status || order.status || "Unknown"}
                            </span>
                          </td>
                          <td className="font-mono text-xs">
                            {order.awb || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[var(--c-border)]">
                <span className="text-xs text-[var(--c-text2)]">
                  Showing {orders.length} of {pagination.total} orders
                </span>

                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary"
                    disabled={loading || pagination.page <= 1}
                    onClick={() => fetchOrders(pagination.page - 1)}
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>

                  <button
                    className="btn-secondary"
                    disabled={loading || pagination.page >= pagination.totalPages}
                    onClick={() => fetchOrders(pagination.page + 1)}
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
