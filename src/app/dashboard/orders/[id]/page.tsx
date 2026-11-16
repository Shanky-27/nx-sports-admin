
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Package, MapPin, User, CreditCard,
  Truck, Calendar, RefreshCw, ExternalLink
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { supabase } from "@/lib/supabase";

type Product = {
  id?: string | number;
  name?: string;
  image?: string;
  size?: string | number;
  qty?: number;
  price?: number | string;
};

type Order = {
  id: string;
  order_reference: string | null;
  aipex_no: string | null;
  awb: string | null;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_mobile: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  pincode: string | null;
  invoice_value: number | string | null;
  payment_mode: string | null;
  carrier: string | null;
  service_type: string | null;
  status: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  delivered_at: string | null;
  product_details: Product[] | null;
};

function OrderDetailsContent()  {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) throw new Error("Backend API URL is missing.");

      const response = await fetch(
        `${apiUrl}/admin/orders/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          },
          cache: "no-store"
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load order.");
      }

      setOrder(result.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const amount = (value: number | string | null) => {
    const n = Number(value);
    return Number.isFinite(n)
      ? `₹${n.toLocaleString("en-IN")}`
      : "—";
  };

  const date = (value: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const badge = (value: string | null) => {
    const status = (value || "").toLowerCase();
    if (["paid", "delivered", "success", "completed"].includes(status))
      return "badge badge-green";
    if (["pending", "processing", "shipped", "in transit"].includes(status))
      return "badge badge-gold";
    if (["failed", "cancelled", "returned"].includes(status))
      return "badge badge-red";
    return "badge badge-blue";
  };

  const products = Array.isArray(order?.product_details)
    ? order.product_details
    : [];

  const address = order
    ? [
        order.address_line1,
        order.address_line2,
        order.address_line3,
        order.pincode
      ].filter(Boolean).join(", ")
    : "";

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="admin-main">
          <AdminHeader
            title="ORDER DETAILS"
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="admin-content">

            <button
              onClick={() => router.push("/dashboard/orders")}
              className="btn-secondary mb-5"
            >
              <ArrowLeft size={16} /> Back to Orders
            </button>

            {loading ? (
              <div className="admin-card p-10 text-center">
                Loading order details...
              </div>
            ) : error || !order ? (
              <div className="admin-card p-8 text-center">
                <p className="text-red-400 mb-4">
                  {error || "Order not found."}
                </p>
                <button onClick={fetchOrder} className="btn-secondary">
                  <RefreshCw size={15} /> Retry
                </button>
              </div>
            ) : (
              <>
                <section className="admin-page-header">
                  <div>
                    <div className="eyebrow">NX SPORTS / ORDER MANAGEMENT</div>
                    <h1 className="admin-page-title mt-2">
                      {order.order_reference || order.id}
                    </h1>
                    <p className="admin-page-subtitle">
                      Created {date(order.created_at)}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className={badge(order.payment_status)}>
                      Payment: {order.payment_status || "Unknown"}
                    </span>
                    <span className={badge(order.delivery_status)}>
                      {order.delivery_status || order.status || "Unknown"}
                    </span>
                  </div>
                </section>

                <section className="stats-grid mb-6">
                  <div className="admin-card p-5">
                    <div className="flex items-center gap-2 text-[var(--c-text2)]">
                      <CreditCard size={17} /> Order Value
                    </div>
                    <div className="stat-card-value">
                      {amount(order.invoice_value)}
                    </div>
                  </div>

                  <div className="admin-card p-5">
                    <div className="flex items-center gap-2 text-[var(--c-text2)]">
                      <Package size={17} /> Products
                    </div>
                    <div className="stat-card-value">{products.length}</div>
                  </div>

                  <div className="admin-card p-5">
                    <div className="flex items-center gap-2 text-[var(--c-text2)]">
                      <Truck size={17} /> Shipment
                    </div>
                    <div className="stat-card-value text-xl">
                      {order.awb || "Not assigned"}
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                  <div className="xl:col-span-2 flex flex-col gap-5">

                    <section className="admin-card">
                      <div className="admin-card-header">
                        <div>
                          <h2 className="admin-card-title">Products Ordered</h2>
                          <p className="admin-card-description">
                            Items included in this order
                          </p>
                        </div>
                      </div>

                      <div className="admin-card-body">
                        {products.length === 0 ? (
                          <p className="text-sm text-[var(--c-text2)]">
                            No product details available.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {products.map((product, index) => (
                              <div
                                key={`${product.id || "product"}-${index}`}
                                className="flex items-center gap-4 p-3 bg-[var(--c-surface2)] border border-[var(--c-border)] rounded-md"
                              >
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name || "Product"}
                                    className="w-20 h-20 object-cover rounded-md"
                                  />
                                ) : (
                                  <div className="w-20 h-20 flex items-center justify-center">
                                    <Package size={25} />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-[var(--c-chrome)]">
                                    {product.name || "Product"}
                                  </h3>
                                  <p className="text-xs text-[var(--c-text2)] mt-1">
                                    Product ID: {product.id ?? "—"}
                                  </p>
                                  <p className="text-xs text-[var(--c-text2)]">
                                    Size: {product.size ?? "—"} · Qty: {product.qty ?? 1}
                                  </p>
                                </div>

                                <div className="font-semibold text-[var(--c-chrome)]">
                                  {amount(product.price ?? null)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="admin-card">
                      <div className="admin-card-header">
                        <div>
                          <h2 className="admin-card-title">Shipping Information</h2>
                          <p className="admin-card-description">
                            ShipLive shipment details
                          </p>
                        </div>
                      </div>

                      <div className="admin-card-body grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <p className="eyebrow">AWB NUMBER</p>
                          <p className="mt-2 font-mono text-blue-400">
                            {order.awb || "Not assigned"}
                          </p>
                        </div>
                        <div>
                          <p className="eyebrow">AIPEX NUMBER</p>
                          <p className="mt-2">{order.aipex_no || "—"}</p>
                        </div>
                        <div>
                          <p className="eyebrow">CARRIER</p>
                          <p className="mt-2">{order.carrier || "—"}</p>
                        </div>
                        <div>
                          <p className="eyebrow">SERVICE TYPE</p>
                          <p className="mt-2">{order.service_type || "—"}</p>
                        </div>
                        <div>
                          <p className="eyebrow">DELIVERY STATUS</p>
                          <p className="mt-2">
                            <span className={badge(order.delivery_status)}>
                              {order.delivery_status || order.status || "Unknown"}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="eyebrow">DELIVERED AT</p>
                          <p className="mt-2">{date(order.delivered_at)}</p>
                        </div>
                      </div>
                    </section>

                    <section className="admin-card">
                      <div className="admin-card-header">
                        <h2 className="admin-card-title">Payment Information</h2>
                      </div>

                      <div className="admin-card-body grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <p className="eyebrow">PAYMENT MODE</p>
                          <p className="mt-2">{order.payment_mode || "—"}</p>
                        </div>
                        <div>
                          <p className="eyebrow">PAYMENT STATUS</p>
                          <p className="mt-2">
                            <span className={badge(order.payment_status)}>
                              {order.payment_status || "Unknown"}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="eyebrow">RAZORPAY ORDER ID</p>
                          <p className="mt-2 text-xs font-mono break-all">
                            {order.razorpay_order_id || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="eyebrow">RAZORPAY PAYMENT ID</p>
                          <p className="mt-2 text-xs font-mono break-all">
                            {order.razorpay_payment_id || "—"}
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="flex flex-col gap-5">

                    <section className="admin-card">
                      <div className="admin-card-header">
                        <h2 className="admin-card-title">Customer</h2>
                      </div>
                      <div className="admin-card-body flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <User size={18} className="text-blue-400" />
                          <div>
                            <p className="text-xs text-[var(--c-text2)]">Name</p>
                            <p className="font-semibold">
                              {order.customer_name || "—"}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="eyebrow">EMAIL</p>
                          <p className="text-sm mt-1 break-all">
                            {order.customer_email || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="eyebrow">MOBILE</p>
                          <p className="text-sm mt-1">
                            {order.customer_mobile || "—"}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="admin-card">
                      <div className="admin-card-header">
                        <h2 className="admin-card-title">Delivery Address</h2>
                      </div>
                      <div className="admin-card-body">
                        <div className="flex items-start gap-3">
                          <MapPin size={18} className="text-blue-400 shrink-0" />
                          <p className="text-sm leading-6">
                            {address || "Address unavailable"}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="admin-card">
                      <div className="admin-card-header">
                        <h2 className="admin-card-title">Order Timeline</h2>
                      </div>
                      <div className="admin-card-body flex flex-col gap-5">
                        <div className="flex gap-3">
                          <Calendar size={17} className="text-blue-400 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">Order Created</p>
                            <p className="text-xs text-[var(--c-text2)]">
                              {date(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Truck size={17} className="text-blue-400 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">Delivery</p>
                            <p className="text-xs text-[var(--c-text2)]">
                              {date(order.delivered_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
export default function OrderDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="loading-state">
          <div className="loading-spinner" />
          LOADING ORDER DETAILS...
        </main>
      }
    >
      <OrderDetailsContent />
    </Suspense>
  );
}