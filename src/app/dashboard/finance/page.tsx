
"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Wallet,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  CalendarDays,
  Truck,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { supabase } from "@/lib/supabase";

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type FinanceSummary = {
  totalOrders: number;
  capturedOrders: number;
  unverifiedOrders: number;
  otherPaymentOrders: number;
  grossCollections: number;
  refunds: number;
  netCollections: number;
  productSales: number;
  shippingCharges: number;
  discounts: number;
  handlingCharges: number;
  packagingCharges: number;
  orderGrandTotal: number;
  unverifiedOrderValue: number;
};

type DailyEntry = {
  date: string;
  orders: number;
  capturedOrders: number;
  grossCollections: number;
  refunds: number;
  netCollections: number;
};

type Transaction = {
  id: string;
  orderReference: string;
  customerName: string | null;
  date: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentId: string | null;
  productSubtotal: number;
  shipping: number;
  discount: number;
  handling: number;
  packaging: number;
  otherCharges: unknown[];
  grandTotal: number;
  payloadAmountPaid: number;
  actualAmountReceived: number | null;
  refunded: number;
  netReceived: number | null;
  paymentDifference: number | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  summary: FinanceSummary;
  dailyBreakdown: DailyEntry[];
  transactions: Transaction[];
};

// --------------------------------------------------
// DATE HELPERS - INDIA TIMEZONE
// --------------------------------------------------

function getIndiaDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
}

function getPeriodDates(period: string) {
  const today = getIndiaDate(new Date());
  const [year, month, day] = today.split("-").map(Number);

  const start = new Date(Date.UTC(year, month - 1, day));
  const end = today;

  if (period === "today") {
    // Same date
  } else if (period === "week") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (period === "month") {
    start.setUTCDate(1);
  } else if (period === "year") {
    start.setUTCMonth(0, 1);
  } else {
    start.setUTCMonth(start.getUTCMonth() - 11, 1);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end,
  };
}

// --------------------------------------------------
// FORMAT HELPERS
// --------------------------------------------------

const numberValue = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (value: number | null) => {
  if (value === null) return "Unverified";

  return `₹${numberValue(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const safeFileDate = () => getIndiaDate(new Date());

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function FinancePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState("month");

  // ------------------------------------------------
  // FETCH FINANCE DATA
  // ------------------------------------------------

  const fetchFinance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "/login";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error("Backend API URL is not configured.");
      }

      const dates = getPeriodDates(period);

      const params = new URLSearchParams({
        start_date: dates.startDate,
        end_date: dates.endDate,
      });

      const response = await fetch(
        `${apiUrl}/admin/finance/summary?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to fetch finance data."
        );
      }

      setSummary(result.summary);
      setDaily(result.dailyBreakdown || []);
      setTransactions(result.transactions || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );

      setSummary(null);
      setDaily([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  // ------------------------------------------------
  // EXCEL EXPORT
  // ------------------------------------------------

  const exportExcel = () => {
    if (!summary || transactions.length === 0) {
      alert("No financial records available to export.");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // SHEET 1: FINANCIAL SUMMARY

    const summaryRows = [
      { Metric: "Total Orders", Amount: summary.totalOrders },
      { Metric: "Captured Orders", Amount: summary.capturedOrders },
      { Metric: "Unverified Orders", Amount: summary.unverifiedOrders },
      { Metric: "Other Payment Orders", Amount: summary.otherPaymentOrders },
      { Metric: "Product Sales", Amount: summary.productSales },
      { Metric: "Shipping Charges", Amount: summary.shippingCharges },
      { Metric: "Discounts", Amount: summary.discounts },
      { Metric: "Handling Charges", Amount: summary.handlingCharges },
      { Metric: "Packaging Charges", Amount: summary.packagingCharges },
      { Metric: "Order Grand Total", Amount: summary.orderGrandTotal },
      { Metric: "Unverified Order Value", Amount: summary.unverifiedOrderValue },
      { Metric: "Gross Collections", Amount: summary.grossCollections },
      { Metric: "Refunds", Amount: summary.refunds },
      { Metric: "Net Collections", Amount: summary.netCollections },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

    summarySheet["!cols"] = [
      { wch: 32 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Financial Summary"
    );

    // SHEET 2: ORDER TRANSACTIONS

    const transactionRows = transactions.map((item) => ({
      "Order Reference": item.orderReference,
      Customer: item.customerName || "",
      "Order Date": formatDateTime(item.date),
      "Payment Status": item.paymentStatus,
      "Payment Method": item.paymentMethod || "",
      "Razorpay Payment ID": item.paymentId || "",

      "Product Subtotal": item.productSubtotal,
      Shipping: item.shipping,
      Discount: item.discount,
      Handling: item.handling,
      Packaging: item.packaging,

      "Other Charges": JSON.stringify(item.otherCharges || []),

      "Order Grand Total": item.grandTotal,
      "Payload Amount Paid": item.payloadAmountPaid,

      "Verified Amount Received":
        item.actualAmountReceived ?? "Unverified",

      Refunded: item.refunded,

      "Net Received":
        item.netReceived ?? "Unverified",

      "Payment Difference":
        item.paymentDifference ?? "Unverified",
    }));

    const transactionSheet =
      XLSX.utils.json_to_sheet(transactionRows);

    transactionSheet["!cols"] = [
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 28 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 15 },
      { wch: 20 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      transactionSheet,
      "Order Transactions"
    );

    // SHEET 3: DAILY SUMMARY

    const dailyRows = daily.map((item) => ({
      Date: item.date,
      Orders: item.orders,
      "Captured Orders": item.capturedOrders,
      "Gross Collections": item.grossCollections,
      Refunds: item.refunds,
      "Net Collections": item.netCollections,
    }));

    const dailySheet = XLSX.utils.json_to_sheet(dailyRows);

    dailySheet["!cols"] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      dailySheet,
      "Daily Summary"
    );

    // EXPORT

    XLSX.writeFile(
      workbook,
      `NX_Sports_Financial_Report_${safeFileDate()}.xlsx`
    );
  };

  // ------------------------------------------------
  // PDF EXPORT
  // ------------------------------------------------

  const exportPDF = () => {
    if (!summary || transactions.length === 0) {
      alert("No financial records available to export.");
      return;
    }

    const doc = new jsPDF("landscape", "mm", "a4");

    const dates = getPeriodDates(period);

    // HEADER

    doc.setFontSize(20);
    doc.setTextColor(20, 40, 75);

    doc.text("NX SPORTS", 14, 17);

    doc.setFontSize(12);
    doc.text("FINANCIAL REPORT", 14, 25);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    doc.text(
      `Reporting Period: ${dates.startDate} to ${dates.endDate}`,
      14,
      32
    );

    doc.text(
      `Generated: ${formatDateTime(new Date().toISOString())}`,
      14,
      37
    );

    // FINANCIAL SUMMARY TABLE

    const summaryRows = [
      ["Total Orders", String(summary.totalOrders)],
      ["Captured Orders", String(summary.capturedOrders)],
      ["Unverified Orders", String(summary.unverifiedOrders)],
      ["Other Payment Orders", String(summary.otherPaymentOrders)],
      ["Product Sales", formatMoney(summary.productSales)],
      ["Shipping Charges", formatMoney(summary.shippingCharges)],
      ["Discounts", formatMoney(summary.discounts)],
      ["Handling Charges", formatMoney(summary.handlingCharges)],
      ["Packaging Charges", formatMoney(summary.packagingCharges)],
      ["Order Grand Total", formatMoney(summary.orderGrandTotal)],
      ["Unverified Order Value", formatMoney(summary.unverifiedOrderValue)],
      ["Gross Collections", formatMoney(summary.grossCollections)],
      ["Refunds", formatMoney(summary.refunds)],
      ["Net Collections", formatMoney(summary.netCollections)],
    ];

    autoTable(doc, {
      startY: 43,
      head: [["Financial Metric", "Amount"]],
      body: summaryRows,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [20, 65, 125],
      },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 40 },
      },
    });

    // ORDER TRANSACTIONS TABLE

    const transactionRows = transactions.map((item) => [
      item.orderReference,
      item.paymentStatus,
      formatMoney(item.productSubtotal),
      formatMoney(item.shipping),
      formatMoney(item.discount),
      formatMoney(item.handling),
      formatMoney(item.packaging),
      formatMoney(item.grandTotal),
      formatMoney(item.actualAmountReceived),
      formatMoney(item.refunded),
      formatMoney(item.netReceived),
    ]);

    const lastTable = (
      doc as jsPDF & {
        lastAutoTable?: { finalY: number };
      }
    ).lastAutoTable;

    autoTable(doc, {
      startY: (lastTable?.finalY || 43) + 10,
      head: [[
        "Order Reference",
        "Payment",
        "Product",
        "Shipping",
        "Discount",
        "Handling",
        "Packaging",
        "Order Total",
        "Received",
        "Refund",
        "Net Received",
      ]],
      body: transactionRows,
      theme: "grid",
      styles: {
        fontSize: 6.5,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [20, 65, 125],
      },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: [0, 1],
    });

    // PDF FOOTER

    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);

      doc.text(
        `NX SPORTS - Financial Report | Page ${page} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 8
      );
    }

    doc.save(
      `NX_Sports_Financial_Report_${safeFileDate()}.pdf`
    );
  };

  // ------------------------------------------------
  // SUMMARY CARDS
  // ------------------------------------------------

  const cards = [
    {
      label: "Gross Collections",
      value: summary?.grossCollections || 0,
      icon: Wallet,
    },
    {
      label: "Net Collections",
      value: summary?.netCollections || 0,
      icon: TrendingUp,
    },
    {
      label: "Product Sales",
      value: summary?.productSales || 0,
      icon: ShoppingBag,
    },
    {
      label: "Shipping Charges",
      value: summary?.shippingCharges || 0,
      icon: Truck,
    },
  ];

  // ------------------------------------------------
  // UI
  // ------------------------------------------------

  return (
    <div className="admin-shell">
      <div className="admin-layout">

        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="admin-main">

          <AdminHeader
            title="FINANCE"
            onMenuClick={() => setSidebarOpen(true)}
          />

          <div className="admin-content">

            {/* PAGE HEADER */}

            <section className="admin-page-header">
              <div>
                <div className="eyebrow">
                  NX SPORTS / BUSINESS
                </div>

                <h1 className="admin-page-title mt-2">
                  Finance Overview
                </h1>

                <p className="admin-page-subtitle">
                  Monitor collections, sales, shipping charges and payments.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  className="btn-secondary"
                  onClick={exportExcel}
                  disabled={loading || !transactions.length}
                >
                  <FileSpreadsheet size={16} />
                  Export Excel
                </button>

                <button
                  className="btn-secondary"
                  onClick={exportPDF}
                  disabled={loading || !transactions.length}
                >
                  <FileText size={16} />
                  Export PDF
                </button>

                <button
                  className="btn-secondary"
                  onClick={fetchFinance}
                  disabled={loading}
                >
                  <RefreshCw
                    size={15}
                    className={loading ? "animate-spin" : ""}
                  />
                  Refresh
                </button>

              </div>
            </section>

            {/* PERIOD FILTERS */}

            <section className="flex flex-wrap gap-2 mb-6">

              {[
                ["today", "Today"],
                ["week", "Last 7 Days"],
                ["month", "This Month"],
                ["year", "This Year"],
                ["all", "Last 12 Months"],
              ].map(([value, label]) => (

                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={
                    period === value
                      ? "btn-primary"
                      : "btn-secondary"
                  }
                >
                  {label}
                </button>

              ))}

            </section>

            {/* ERROR */}

            {error && (
              <div className="admin-card p-5 mb-6 text-red-400 flex items-center gap-3">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {/* MAIN FINANCIAL CARDS */}

            <section className="stats-grid mb-6">

              {cards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    className="admin-card p-5"
                    key={card.label}
                  >
                    <div className="flex items-center gap-3">

                      <div className="stat-card-icon">
                        <Icon size={18} />
                      </div>

                      <span className="text-sm text-[var(--c-text2)]">
                        {card.label}
                      </span>

                    </div>

                    <div className="stat-card-value mt-3">
                      {loading ? "—" : formatMoney(card.value)}
                    </div>
                  </div>
                );
              })}

            </section>

            {/* ORDER AND PAYMENT COUNTS */}

            <section className="stats-grid mb-6">

              <div className="admin-card p-5">
                <div className="text-sm text-[var(--c-text2)]">
                  Total Orders
                </div>

                <div className="stat-card-value">
                  {loading ? "—" : summary?.totalOrders || 0}
                </div>
              </div>

              <div className="admin-card p-5">
                <div className="text-sm text-[var(--c-text2)]">
                  Captured Orders
                </div>

                <div className="stat-card-value text-emerald-400">
                  {loading ? "—" : summary?.capturedOrders || 0}
                </div>
              </div>

              <div className="admin-card p-5">
                <div className="text-sm text-[var(--c-text2)]">
                  Unverified Payments
                </div>

                <div className="stat-card-value text-amber-400">
                  {loading ? "—" : summary?.unverifiedOrders || 0}
                </div>
              </div>

              <div className="admin-card p-5">
                <div className="text-sm text-[var(--c-text2)]">
                  Refunds
                </div>

                <div className="stat-card-value">
                  {loading ? "—" : formatMoney(summary?.refunds || 0)}
                </div>
              </div>

            </section>

            {/* ADDITIONAL COST BREAKDOWN */}

            <section className="admin-card mb-6">

              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">
                    Sales & Charges Breakdown
                  </h2>

                  <p className="admin-card-description">
                    Order payload values, separated by component
                  </p>
                </div>
              </div>

              <div className="admin-card-body">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                  <div>
                    <div className="text-xs text-[var(--c-text2)]">
                      Product Subtotal
                    </div>

                    <div className="text-xl font-semibold mt-1">
                      {loading ? "—" : formatMoney(summary?.productSales || 0)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[var(--c-text2)]">
                      Shipping Charges
                    </div>

                    <div className="text-xl font-semibold mt-1">
                      {loading ? "—" : formatMoney(summary?.shippingCharges || 0)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[var(--c-text2)]">
                      Discounts
                    </div>

                    <div className="text-xl font-semibold mt-1">
                      {loading ? "—" : formatMoney(summary?.discounts || 0)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[var(--c-text2)]">
                      Handling Charges
                    </div>

                    <div className="text-xl font-semibold mt-1">
                      {loading ? "—" : formatMoney(summary?.handlingCharges || 0)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[var(--c-text2)]">
                      Packaging Charges
                    </div>

                    <div className="text-xl font-semibold mt-1">
                      {loading ? "—" : formatMoney(summary?.packagingCharges || 0)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[var(--c-text2)]">
                      Order Grand Total
                    </div>

                    <div className="text-xl font-semibold mt-1 text-blue-400">
                      {loading ? "—" : formatMoney(summary?.orderGrandTotal || 0)}
                    </div>
                  </div>

                </div>

              </div>

            </section>

            {/* DAILY COLLECTIONS */}

            <section className="admin-card mb-6">

              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">
                    Daily Collections
                  </h2>

                  <p className="admin-card-description">
                    Captured payment breakdown by date
                  </p>
                </div>

                <CalendarDays size={20} />
              </div>

              <div className="table-wrap">

                <table className="admin-table">

                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Orders</th>
                      <th>Captured</th>
                      <th>Gross</th>
                      <th>Refunds</th>
                      <th>Net</th>
                    </tr>
                  </thead>

                  <tbody>

                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10">
                          Loading finance data...
                        </td>
                      </tr>
                    ) : daily.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10">
                          No finance records for this period.
                        </td>
                      </tr>
                    ) : (
                      daily.map((item) => (
                        <tr key={item.date}>
                          <td>{item.date}</td>
                          <td>{item.orders}</td>
                          <td>{item.capturedOrders}</td>
                          <td>{formatMoney(item.grossCollections)}</td>
                          <td>{formatMoney(item.refunds)}</td>

                          <td className="font-semibold text-emerald-400">
                            {formatMoney(item.netCollections)}
                          </td>
                        </tr>
                      ))
                    )}

                  </tbody>

                </table>

              </div>

            </section>

            {/* ORDER-WISE FINANCIAL BREAKDOWN */}

            <section className="admin-card mb-6">

              <div className="admin-card-header">

                <div>
                  <h2 className="admin-card-title">
                    Order-wise Financial Breakdown
                  </h2>

                  <p className="admin-card-description">
                    Product value, shipping, charges and verified Razorpay collections
                  </p>
                </div>

                <span className="badge badge-blue">
                  {transactions.length} Orders
                </span>

              </div>

              <div className="table-wrap">

                <table className="admin-table">

                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Product</th>
                      <th>Shipping</th>
                      <th>Discount</th>
                      <th>Order Total</th>
                      <th>Actual Received</th>
                      <th>Refund</th>
                      <th>Net Received</th>
                      <th>Payment</th>
                    </tr>
                  </thead>

                  <tbody>

                    {loading ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10">
                          Loading transactions...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10">
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((item) => (
                        <Fragment key={item.id}>

                          <tr>

                            <td>
                              <div className="font-semibold text-blue-400">
                                {item.orderReference}
                              </div>

                              <div className="text-xs text-[var(--c-text2)]">
                                {item.customerName || "Customer"}
                              </div>
                            </td>

                            <td>{formatMoney(item.productSubtotal)}</td>
                            <td>{formatMoney(item.shipping)}</td>
                            <td>{formatMoney(item.discount)}</td>

                            <td className="font-semibold">
                              {formatMoney(item.grandTotal)}
                            </td>

                            <td className="text-emerald-400">
                              {formatMoney(item.actualAmountReceived)}
                            </td>

                            <td>{formatMoney(item.refunded)}</td>

                            <td className="font-semibold text-emerald-400">
                              {formatMoney(item.netReceived)}
                            </td>

                            <td>
                              <span
                                className={
                                  item.paymentStatus === "captured"
                                    ? "badge badge-green"
                                    : "badge badge-gold"
                                }
                              >
                                {item.paymentStatus}
                              </span>
                            </td>

                          </tr>

                          {/* EXPANDABLE DETAILS */}

                          <tr>
                            <td colSpan={9} className="!p-0">

                              <details className="group">

                                <summary className="cursor-pointer list-none px-5 py-3 flex items-center justify-between text-xs text-[var(--c-text2)] hover:text-blue-400">
                                  <span>
                                    View complete order financial details
                                  </span>

                                  <ChevronDown
                                    size={16}
                                    className="transition-transform group-open:rotate-180"
                                  />
                                </summary>

                                <div className="p-5 border-t border-[var(--c-border)]">

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

                                    <div>
                                      <div className="text-xs text-[var(--c-text2)]">
                                        Order Date
                                      </div>
                                      <div className="mt-1 font-medium">
                                        {formatDateTime(item.date)}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-xs text-[var(--c-text2)]">
                                        Razorpay Payment ID
                                      </div>
                                      <div className="mt-1 text-xs font-mono break-all">
                                        {item.paymentId || "Not available"}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-xs text-[var(--c-text2)]">
                                        Payment Method
                                      </div>
                                      <div className="mt-1 font-medium">
                                        {item.paymentMethod || "Not available"}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-xs text-[var(--c-text2)]">
                                        Payload Amount Paid
                                      </div>
                                      <div className="mt-1 font-medium">
                                        {formatMoney(item.payloadAmountPaid)}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-xs text-[var(--c-text2)]">
                                        Handling
                                      </div>
                                      <div className="mt-1 font-medium">
                                        {formatMoney(item.handling)}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-xs text-[var(--c-text2)]">
                                        Packaging
                                      </div>
                                      <div className="mt-1 font-medium">
                                        {formatMoney(item.packaging)}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-xs text-[var(--c-text2)]">
                                        Payment Difference
                                      </div>
                                      <div className="mt-1 font-medium">
                                        {formatMoney(item.paymentDifference)}
                                      </div>
                                    </div>

                                    <div>
                                      <div className="text-xs text-[var(--c-text2)]">
                                        Net Received
                                      </div>
                                      <div className="mt-1 font-semibold text-emerald-400">
                                        {formatMoney(item.netReceived)}
                                      </div>
                                    </div>

                                  </div>

                                  <div className="mt-5 pt-4 border-t border-[var(--c-border)]">

                                    <div className="text-xs text-[var(--c-text2)] mb-2">
                                      Other Charges
                                    </div>

                                    <pre className="text-xs whitespace-pre-wrap break-words text-[var(--c-text)]">
                                      {JSON.stringify(item.otherCharges || [], null, 2)}
                                    </pre>

                                  </div>

                                </div>

                              </details>

                            </td>
                          </tr>

                        </Fragment>
                      ))
                    )}

                  </tbody>

                </table>

              </div>

              <div className="px-5 py-4 border-t border-[var(--c-border)] text-xs text-[var(--c-text2)]">
                Showing {transactions.length} orders for the selected period.
              </div>

            </section>

            {/* REPORT NOTE */}

            <div className="text-xs text-[var(--c-text2)] pb-6">
              Note: Collections are based on verified captured Razorpay payments.
              Product, shipping and other charge breakdowns are based on stored
              order payloads. Unverified payments are excluded from confirmed
              collections.
            </div>

          </div>

        </main>

      </div>
    </div>
  );
}
