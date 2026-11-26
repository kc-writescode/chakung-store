"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StoredOrder } from "@/lib/orders";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function StaffPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [pushStatus, setPushStatus] = useState<"default" | "granted" | "denied">("default");
  const [pushLoading, setPushLoading] = useState(false);
  const [testPushMsg, setTestPushMsg] = useState("");
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [shiprocketLoading, setShiprocketLoading] = useState<Record<string, boolean>>({});
  const [syncingRazorpay, setSyncingRazorpay] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  // 1. Check initial staff session
  useEffect(() => {
    checkSession();
    checkPushPermission();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/staff/auth");
      const data = await res.json();
      setIsAuthenticated(Boolean(data.authenticated));
      if (data.authenticated) {
        fetchOrders();
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const checkPushPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushStatus(Notification.permission);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/staff/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSyncRazorpay = async () => {
    setSyncingRazorpay(true);
    setSyncMessage("Connecting to Razorpay to import orders...");
    try {
      const res = await fetch("/api/staff/sync-razorpay", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMessage(`✓ Synced! Found ${data.importedCount} new order(s) from Razorpay.`);
        fetchOrders();
      } else {
        setSyncMessage(`⚠️ Sync error: ${data.error}`);
      }
    } catch {
      setSyncMessage("⚠️ Could not connect to Razorpay.");
    } finally {
      setSyncingRazorpay(false);
      setTimeout(() => setSyncMessage(""), 6000);
    }
  };

  // 2. PIN Login Handler
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;

    setIsLoggingIn(true);
    setPinError("");

    try {
      const res = await fetch("/api/staff/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        fetchOrders();
      } else {
        setPinError(data.error || "Incorrect security PIN. Please try again.");
      }
    } catch {
      setPinError("Connection error while verifying PIN.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/staff/auth", { method: "DELETE" });
    setIsAuthenticated(false);
    setPin("");
  };

  // 3. Web Push Notification Enablement
  const handleEnablePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported on this browser.");
      return;
    }

    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission !== "granted") {
        alert("Push notification permission was not granted.");
        return;
      }

      // Register Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const keyRes = await fetch("/api/push/subscribe");
      const { publicKey } = await keyRes.json();

      // Subscribe to PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription on server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      alert("🎉 Push notifications enabled on this device! You will get alerts for new orders.");
    } catch (err: any) {
      console.error("Failed to subscribe push:", err);
      alert(`Could not enable push notifications: ${err.message}`);
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setTestPushMsg("Sending test notification...");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestPushMsg(`✓ Push delivered to ${data.result?.sent || 1} active device(s)!`);
      } else {
        setTestPushMsg("⚠️ Test failed. Make sure notifications are allowed.");
      }
    } catch {
      setTestPushMsg("⚠️ Error sending test push.");
    }
    setTimeout(() => setTestPushMsg(""), 5000);
  };

  // 4. Update Order Status & Speed Post Tracking Number
  const handleUpdateStatus = async (orderId: string, newStatus: StoredOrder["status"]) => {
    try {
      const res = await fetch("/api/staff/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      alert("Failed to update order status");
    }
  };

  const handleSaveTracking = async (orderId: string) => {
    const trackingNumber = trackingInputs[orderId];
    if (trackingNumber === undefined) return;

    try {
      const res = await fetch("/api/staff/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          trackingNumber,
          status: "Dispatched via Speed Post",
        }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, trackingNumber, status: "Dispatched via Speed Post" }
              : o
          )
        );
        alert(`Saved Speed Post tracking ${trackingNumber} for order #${orderId.slice(-6)}`);
      }
    } catch {
      alert("Failed to save tracking number");
    }
  };

  const handleCreateShiprocket = async (orderId: string) => {
    setShiprocketLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch("/api/shiprocket/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`🚀 Order created on Shiprocket!\nShiprocket Order ID: ${data.shiprocketOrderId}\nShipment ID: ${data.shipmentId}`);
        fetchOrders();
      } else {
        alert(`Shiprocket error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setShiprocketLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" && order.status === "Paid / Pending Pack") ||
      (filterStatus === "packed" && order.status === "Packed") ||
      (filterStatus === "dispatched" && order.status === "Dispatched via Speed Post") ||
      (filterStatus === "delivered" && order.status === "Delivered");

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      order.id.toLowerCase().includes(query) ||
      order.customer.name.toLowerCase().includes(query) ||
      order.customer.phone.includes(query) ||
      order.customer.pincode.includes(query);

    return matchesStatus && matchesSearch;
  });

  const pendingCount = orders.filter((o) => o.status === "Paid / Pending Pack").length;
  const packedCount = orders.filter((o) => o.status === "Packed").length;
  const dispatchedCount = orders.filter((o) => o.status === "Dispatched via Speed Post").length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <main className="staff-portal-wrap py-24 text-center">
        <p>Checking staff access...</p>
      </main>
    );
  }

  // ── PIN AUTHENTICATION SCREEN ──
  if (!isAuthenticated) {
    return (
      <main className="staff-auth-page">
        <div className="store-wrap">
          <div className="staff-auth-card">
            <div className="auth-brand-badge">🏔️</div>
            <p className="auth-kicker">Chakung Village Store · Soreng, Sikkim</p>
            <h1 className="auth-title">Staff Portal Sign-in</h1>
            <p className="auth-desc">
              Enter your staff security PIN to access live harvest orders, packing slips, and Speed Post tracking.
            </p>

            <form onSubmit={handlePinSubmit} className="staff-pin-form">
              <div className="pin-input-group">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="Enter Security PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="staff-pin-input"
                  autoFocus
                />
              </div>

              {pinError && <p className="pin-error-msg">⚠️ {pinError}</p>}

              <button
                type="submit"
                disabled={isLoggingIn || !pin}
                className="store-btn-solid store-btn-large w-full justify-center"
              >
                {isLoggingIn ? "Verifying..." : "Unlock Staff Portal"}
              </button>

          
            </form>
          </div>
        </div>
      </main>
    );
  }

  // ── STAFF ORDER DASHBOARD ──
  return (
    <main className="staff-dashboard-page">
      <div className="store-wrap">
        {/* Dashboard Header */}
        <div className="staff-top-bar">
          <div>
            <div className="staff-breadcrumb">
              <Link href="/">← Store Home</Link>
              <span>/</span>
              <span>Staff Dashboard</span>
            </div>
            <h1 className="staff-main-title">Village Harvest Orders</h1>
            <p className="staff-subtitle">
              Soreng District Packing & India Post Speed Post Dispatch
            </p>
          </div>

          <div className="staff-top-actions">
            {pushStatus === "granted" ? (
              <div className="push-active-pill">
                <span>🔔 Push Active</span>
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  className="test-push-btn"
                  title="Test notification"
                >
                  Test Alert
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="enable-push-btn"
              >
                {pushLoading ? "Enabling..." : "🔔 Enable Device Push"}
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="staff-logout-btn"
            >
              Sign Out
            </button>
          </div>
        </div>

        {testPushMsg && (
          <div className="test-push-banner">{testPushMsg}</div>
        )}

        {syncMessage && (
          <div className="test-push-banner" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
            {syncMessage}
          </div>
        )}

        {/* Stats Row */}
        <div className="staff-stats-grid">
          <div className="staff-stat-card">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{orders.length}</span>
          </div>
          <div className="staff-stat-card stat-pending">
            <span className="stat-label">Pending Packing</span>
            <span className="stat-value">{pendingCount}</span>
          </div>
          <div className="staff-stat-card stat-packed">
            <span className="stat-label">Packed & Ready</span>
            <span className="stat-value">{packedCount}</span>
          </div>
          <div className="staff-stat-card stat-dispatched">
            <span className="stat-label">Dispatched</span>
            <span className="stat-value">{dispatchedCount}</span>
          </div>
          <div className="staff-stat-card">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">₹{totalRevenue}</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="staff-controls-bar">
          <div className="staff-search-box">
            <input
              type="text"
              placeholder="Search customer, phone, PIN, order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="staff-filter-tabs">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`filter-tab ${filterStatus === "all" ? "active" : ""}`}
            >
              All ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              className={`filter-tab ${filterStatus === "pending" ? "active" : ""}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("packed")}
              className={`filter-tab ${filterStatus === "packed" ? "active" : ""}`}
            >
              Packed ({packedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("dispatched")}
              className={`filter-tab ${filterStatus === "dispatched" ? "active" : ""}`}
            >
              Dispatched ({dispatchedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncRazorpay}
            disabled={syncingRazorpay}
            className="sync-razorpay-btn"
            title="Import all paid transactions from Razorpay"
          >
            {syncingRazorpay ? "Syncing..." : "🔄 Sync with Razorpay"}
          </button>

          <button
            type="button"
            onClick={fetchOrders}
            className="refresh-btn"
            title="Refresh Orders"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Orders List */}
        <div className="staff-orders-section">
          {loadingOrders ? (
            <div className="staff-empty-box">Loading orders from Chakung...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="staff-empty-box">
              <span style={{ fontSize: "36px" }}>📦</span>
              <h3>No orders match your filter</h3>
              <p>When new orders are placed with Razorpay, they will appear here instantly.</p>
            </div>
          ) : (
            <div className="staff-orders-list">
              {filteredOrders.map((order) => {
                const phoneDigits = order.customer.phone.replace(/[^0-9]/g, "");
                const waMessage = `Hello ${order.customer.name}! This is Chakung Store regarding your order #${order.id.slice(-6)}.\nStatus: ${order.status}${
                  order.trackingNumber
                    ? `\nSpeed Post Consignment: ${order.trackingNumber}\nTrack here: https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`
                    : ""
                }`;
                const waUrl = `https://wa.me/91${phoneDigits.slice(-10)}?text=${encodeURIComponent(waMessage)}`;

                return (
                  <article key={order.id} className="staff-order-card">
                    {/* Header: ID, Date, Status */}
                    <div className="order-card-top">
                      <div className="order-top-id">
                        <span className="order-ref-badge">#{order.id.slice(-8)}</span>
                        <span className="order-time">
                          {new Date(order.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="payment-ref-tag">
                          Razorpay: <code>{order.paymentId.slice(-8)}</code>
                        </span>
                      </div>

                      <div className="order-status-select-wrap">
                        <label>Status:</label>
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleUpdateStatus(
                              order.id,
                              e.target.value as StoredOrder["status"]
                            )
                          }
                          className={`status-badge-select status-${order.status
                            .toLowerCase()
                            .replace(/[^a-z]/g, "-")}`}
                        >
                          <option value="Paid / Pending Pack">Paid / Pending Pack</option>
                          <option value="Packed">Packed</option>
                          <option value="Dispatched via Speed Post">
                            Dispatched via Speed Post
                          </option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </div>
                    </div>

                    {/* Middle: Customer Info & Items */}
                    <div className="order-card-body">
                      {/* Customer Info */}
                      <div className="order-col-customer">
                        <h4>📍 Shipping Destination</h4>
                        <p className="cust-name">
                          <strong>{order.customer.name}</strong>
                        </p>
                        <p className="cust-phone">
                          <span>📞 {order.customer.phone}</span>
                        </p>
                        <p className="cust-email">
                          <span>✉️ {order.customer.email}</span>
                        </p>
                        <p className="cust-address">
                          {order.customer.address}, {order.customer.city},{" "}
                          {order.customer.state} - <strong>{order.customer.pincode}</strong>
                        </p>

                        <div className="customer-contact-actions">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-wa-action"
                          >
                            💬 WhatsApp Customer
                          </a>
                          <a href={`tel:+91${phoneDigits.slice(-10)}`} className="btn-call-action">
                            📞 Call
                          </a>
                        </div>
                      </div>

                      {/* Items to Pack */}
                      <div className="order-col-items">
                        <h4>📦 Items to Pack ({order.items.length})</h4>
                        <ul className="packing-items-table">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="packing-item-row">
                              <span className="item-qty-badge">{item.quantity}×</span>
                              <div className="item-text">
                                <span className="item-title">{item.name}</span>
                                <span className="item-wt">{item.weight}</span>
                              </div>
                              <span className="item-cost">
                                ₹{item.itemTotal || (item.unitPrice ? item.unitPrice * item.quantity : 0)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="order-amounts-row">
                          <span>Subtotal: ₹{order.subtotal}</span>
                          <span>Speed Post: ₹{order.shipping}</span>
                          <strong className="order-grand-total">Total Paid: ₹{order.total}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Shiprocket 1-Click Shipping & Speed Post */}
                    <div className="order-card-footer">
                      <div className="shiprocket-action-row">
                        {order.shiprocketOrderId ? (
                          <div className="shiprocket-active-badge">
                            <span>🚀 Shiprocket Order #{order.shiprocketOrderId}</span>
                            {order.shiprocketShipmentId && (
                              <span className="shipment-id-tag">Shipment #{order.shiprocketShipmentId}</span>
                            )}
                            <a
                              href="https://app.shiprocket.in/orders"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-shiprocket-panel"
                            >
                              Manage in Shiprocket ↗
                            </a>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCreateShiprocket(order.id)}
                            disabled={shiprocketLoading[order.id]}
                            className="btn-shiprocket"
                          >
                            {shiprocketLoading[order.id] ? "Creating on Shiprocket..." : "🚀 Ship via Shiprocket"}
                          </button>
                        )}
                      </div>

                      <div className="tracking-edit-row">
                        <label htmlFor={`track-${order.id}`}>Manual Tracking / Speed Post:</label>
                        <div className="tracking-input-wrap">
                          <input
                            id={`track-${order.id}`}
                            type="text"
                            placeholder="e.g. EW123456789IN"
                            defaultValue={order.trackingNumber || ""}
                            onChange={(e) =>
                              setTrackingInputs((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveTracking(order.id)}
                            className="btn-save-track"
                          >
                            Save Tracking
                          </button>
                        </div>

                        {order.trackingNumber && (
                          <a
                            href="https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-indiapost-track"
                          >
                            Track on India Post ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
