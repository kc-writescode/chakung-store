"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StoredOrder } from "@/lib/orders";
import { StoredProduct } from "@/lib/products-store";

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

type StaffTab = "orders" | "products" | "razorpay";

interface ProductFormState {
  slug: string;
  name: string;
  localName: string;
  tagline: string;
  description: string;
  category: "Spice" | "Ferment" | "Grain" | "Legume" | "Seed";
  priceNum: string;
  weight: string;
  image: string;
  giTag: boolean;
  organic: boolean;
  featured: boolean;
  altitude: string;
  harvestSeason: string;
  tastingNotes: string;
  traditionalUses: string;
  pairingSuggestions: string;
  syncRazorpay: boolean;
}

const EMPTY_FORM: ProductFormState = {
  slug: "",
  name: "",
  localName: "",
  tagline: "",
  description: "",
  category: "Grain",
  priceNum: "",
  weight: "500g pack",
  image: "",
  giTag: false,
  organic: true,
  featured: true,
  altitude: "1,200m – 1,800m",
  harvestSeason: "October – December",
  tastingNotes: "Earthy mountain aroma, Natural sweetness",
  traditionalUses: "Traditional Sikkimese kitchen preparation",
  pairingSuggestions: "Steamed mountain rice, Dalle chilli chutney",
  syncRazorpay: true,
};

export default function StaffPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<StaffTab>("orders");

  // Orders state
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [shiprocketLoading, setShiprocketLoading] = useState<Record<string, boolean>>({});
  const [syncingRazorpay, setSyncingRazorpay] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  // Push state
  const [pushStatus, setPushStatus] = useState<"default" | "granted" | "denied">("default");
  const [pushLoading, setPushLoading] = useState(false);
  const [testPushMsg, setTestPushMsg] = useState("");

  // Products & Razorpay Catalog state
  const [productsList, setProductsList] = useState<StoredProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [razorpayInfo, setRazorpayInfo] = useState<{
    configured: boolean;
    keyIdMasked: string;
    mode: string;
  }>({ configured: false, keyIdMasked: "", mode: "UNKNOWN" });
  const [catalogSyncing, setCatalogSyncing] = useState(false);
  const [catalogMsg, setCatalogMsg] = useState("");

  // Product Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(EMPTY_FORM);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState("");

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
        fetchProducts();
        fetchGalleryImages();
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

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/staff/products");
      if (res.ok) {
        const data = await res.json();
        setProductsList(data.products || []);
        if (data.razorpay) setRazorpayInfo(data.razorpay);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchGalleryImages = async () => {
    try {
      const res = await fetch("/api/staff/upload-image");
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data.images || []);
      }
    } catch {}
  };

  const handleSyncRazorpay = async () => {
    setSyncingRazorpay(true);
    setSyncMessage("Connecting to Razorpay to import orders...");
    try {
      const res = await fetch("/api/staff/sync-razorpay", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMessage(`✓ Synced! Loaded ${data.totalOrders} captured order(s) from Razorpay.`);
        if (data.orders) setOrders(data.orders);
        else fetchOrders();
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

  const handleSyncCatalogToRazorpay = async () => {
    setCatalogSyncing(true);
    setCatalogMsg("Syncing all products & prices to Razorpay Items API...");
    try {
      const res = await fetch("/api/staff/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-razorpay" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProductsList(data.products || []);
        setCatalogMsg(`✓ Synced ${data.synced} product(s) with Razorpay Items Catalog!`);
      } else {
        setCatalogMsg(`⚠️ Razorpay sync failed: ${data.error}`);
      }
    } catch {
      setCatalogMsg("⚠️ Could not reach Razorpay Items API.");
    } finally {
      setCatalogSyncing(false);
      setTimeout(() => setCatalogMsg(""), 6000);
    }
  };

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
        fetchProducts();
        fetchGalleryImages();
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

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const keyRes = await fetch("/api/push/subscribe");
      const { publicKey } = await keyRes.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      alert("🎉 Push notifications enabled on this device! You will get alerts for new orders.");
    } catch (err: any) {
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
    } catch {
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
        alert(
          `🚀 Order created on Shiprocket!\nShiprocket Order ID: ${data.shiprocketOrderId}\nShipment ID: ${data.shipmentId}`
        );
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

  // ── Product CRUD Handlers ──
  const openAddModal = () => {
    setEditingSlug(null);
    setFormState(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (p: StoredProduct) => {
    setEditingSlug(p.slug);
    setFormState({
      slug: p.slug,
      name: p.name,
      localName: p.localName,
      tagline: p.tagline,
      description: p.description,
      category: p.category,
      priceNum: p.price.replace(/[^0-9]/g, ""),
      weight: p.weight,
      image: p.image || "",
      giTag: Boolean(p.giTag),
      organic: p.organic !== false,
      featured: Boolean(p.featured),
      altitude: p.altitude || "1,200m – 1,800m",
      harvestSeason: p.harvestSeason || "October – December",
      tastingNotes: (p.tastingNotes || []).join(", "),
      traditionalUses: (p.traditionalUses || []).join("\n"),
      pairingSuggestions: (p.pairingSuggestions || []).join(", "),
      syncRazorpay: true,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setFormError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/staff/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFormState((prev) => ({ ...prev, image: data.url }));
        if (data.storage === "local") fetchGalleryImages();
      } else {
        setFormError(data.error || "Image upload failed");
      }
    } catch {
      setFormError("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setFormError("");

    try {
      const method = editingSlug ? "PATCH" : "POST";
      const payload = {
        slug: editingSlug || formState.slug || undefined,
        name: formState.name,
        localName: formState.localName,
        tagline: formState.tagline,
        description: formState.description,
        category: formState.category,
        price: formState.priceNum,
        weight: formState.weight,
        image: formState.image,
        giTag: formState.giTag,
        organic: formState.organic,
        featured: formState.featured,
        altitude: formState.altitude,
        harvestSeason: formState.harvestSeason,
        tastingNotes: formState.tastingNotes,
        traditionalUses: formState.traditionalUses,
        pairingSuggestions: formState.pairingSuggestions,
        syncRazorpay: formState.syncRazorpay,
      };

      const res = await fetch("/api/staff/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setModalOpen(false);
        setCatalogMsg(
          `✓ ${editingSlug ? "Updated" : "Added"} "${data.product.name}"${
            data.product.razorpayItemId ? ` (Razorpay: ${data.product.razorpayItemId})` : ""
          }`
        );
        fetchProducts();
        setTimeout(() => setCatalogMsg(""), 5000);
      } else {
        setFormError(data.error || "Failed to save product");
      }
    } catch {
      setFormError("Network error while saving product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (p: StoredProduct) => {
    if (!confirm(`Remove "${p.name}" from Chakung Store? This will also deactivate it in Razorpay.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/staff/products?slug=${encodeURIComponent(p.slug)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProductsList((prev) => prev.filter((item) => item.slug !== p.slug));
        setCatalogMsg(`✓ Removed "${p.name}" from store.`);
        setTimeout(() => setCatalogMsg(""), 4000);
      } else {
        alert(`Failed to remove: ${data.error}`);
      }
    } catch {
      alert("Error removing product");
    }
  };

  // Filtered orders
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

  // Filtered products
  const filteredProducts = productsList.filter((p) => {
    const matchesCat = productCategory === "all" || p.category === productCategory;
    const q = productSearch.toLowerCase().trim();
    const matchesQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.localName.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q);
    return matchesCat && matchesQ;
  });

  const pendingCount = orders.filter((o) => o.status === "Paid / Pending Pack").length;
  const packedCount = orders.filter((o) => o.status === "Packed").length;
  const dispatchedCount = orders.filter((o) => o.status === "Dispatched via Speed Post").length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

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
              Enter your staff security PIN to manage products, pricing, images, Razorpay integration, and live harvest orders.
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

  // ── STAFF PORTAL DASHBOARD ──
  return (
    <main className="staff-dashboard-page">
      <div className="store-wrap">
        {/* Dashboard Header */}
        <div className="staff-top-bar">
          <div>
            <div className="staff-breadcrumb">
              <Link href="/">← Store Home</Link>
              <span>/</span>
              <span>Staff Portal</span>
            </div>
            <h1 className="staff-main-title">Chakung Store Admin</h1>
            <p className="staff-subtitle">
              Orders, Harvest Catalogue, Pricing, Images &amp; Razorpay Integration
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

            <button type="button" onClick={handleLogout} className="staff-logout-btn">
              Sign Out
            </button>
          </div>
        </div>

        {/* Primary Section Tabs */}
        <div className="staff-main-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`staff-main-tab ${activeTab === "orders" ? "active" : ""}`}
          >
            📦 Orders &amp; Dispatch ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`staff-main-tab ${activeTab === "products" ? "active" : ""}`}
          >
            🌾 Products &amp; Pricing ({productsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("razorpay")}
            className={`staff-main-tab ${activeTab === "razorpay" ? "active" : ""}`}
          >
            💳 Razorpay Integration
          </button>
        </div>

        {testPushMsg && <div className="test-push-banner">{testPushMsg}</div>}

        {syncMessage && (
          <div
            className="test-push-banner"
            style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}
          >
            {syncMessage}
          </div>
        )}

        {catalogMsg && (
          <div
            className="test-push-banner"
            style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}
          >
            {catalogMsg}
          </div>
        )}

        {/* ═══════════════════════ TAB 1: ORDERS ═══════════════════════ */}
        {activeTab === "orders" && (
          <>
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
                <span className="stat-label">Packed &amp; Ready</span>
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
              >
                {syncingRazorpay ? "Syncing..." : "🔄 Sync with Razorpay"}
              </button>

              <button type="button" onClick={fetchOrders} className="refresh-btn">
                ↻ Refresh
              </button>
            </div>

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

                        <div className="order-card-body">
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
                              <a
                                href={`tel:+91${phoneDigits.slice(-10)}`}
                                className="btn-call-action"
                              >
                                📞 Call
                              </a>
                            </div>
                          </div>

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
                                    ₹
                                    {item.itemTotal ||
                                      (item.unitPrice ? item.unitPrice * item.quantity : 0)}
                                  </span>
                                </li>
                              ))}
                            </ul>

                            <div className="order-amounts-row">
                              <span>Subtotal: ₹{order.subtotal}</span>
                              <span>Speed Post: ₹{order.shipping}</span>
                              <strong className="order-grand-total">
                                Total Paid: ₹{order.total}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="order-card-footer">
                          <div className="shiprocket-action-row">
                            {order.shiprocketOrderId ? (
                              <div className="shiprocket-active-badge">
                                <span>🚀 Shiprocket Order #{order.shiprocketOrderId}</span>
                                {order.shiprocketShipmentId && (
                                  <span className="shipment-id-tag">
                                    Shipment #{order.shiprocketShipmentId}
                                  </span>
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
                                {shiprocketLoading[order.id]
                                  ? "Creating on Shiprocket..."
                                  : "🚀 Ship via Shiprocket"}
                              </button>
                            )}
                          </div>

                          <div className="tracking-edit-row">
                            <label htmlFor={`track-${order.id}`}>
                              Manual Tracking / Speed Post:
                            </label>
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
          </>
        )}

        {/* ═══════════════════════ TAB 2: PRODUCTS & PRICING ═══════════════════════ */}
        {activeTab === "products" && (
          <section className="staff-products-section">
            <div className="staff-controls-bar">
              <div className="staff-search-box">
                <input
                  type="text"
                  placeholder="Search products by name, local name, slug..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>

              <div className="staff-filter-tabs">
                {["all", "Grain", "Legume", "Spice", "Ferment", "Seed"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setProductCategory(cat)}
                    className={`filter-tab ${productCategory === cat ? "active" : ""}`}
                  >
                    {cat === "all" ? `All (${productsList.length})` : cat}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSyncCatalogToRazorpay}
                disabled={catalogSyncing}
                className="sync-razorpay-btn"
              >
                {catalogSyncing ? "Syncing..." : "💳 Sync All to Razorpay"}
              </button>

              <button type="button" onClick={openAddModal} className="add-product-btn">
                ➕ Add New Product
              </button>
            </div>

            {loadingProducts ? (
              <div className="staff-empty-box">Loading store catalogue...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="staff-empty-box">
                <span style={{ fontSize: "36px" }}>🌾</span>
                <h3>No products match your filter</h3>
                <p>Click &ldquo;Add New Product&rdquo; to add an item to Chakung Store.</p>
              </div>
            ) : (
              <div className="staff-products-grid">
                {filteredProducts.map((p) => (
                  <article key={p.slug} className="staff-product-card">
                    <div className="sp-card-top">
                      <div className="sp-thumb-wrap">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt={p.name} className="sp-thumb-img" />
                        ) : (
                          <span className="sp-thumb-fallback">🌾</span>
                        )}
                      </div>
                      <div className="sp-head-info">
                        <div className="sp-badges-row">
                          <span className="badge category-badge">{p.category}</span>
                          {p.featured && <span className="badge organic-badge">Featured</span>}
                          {p.giTag && <span className="badge gi-badge">GI Tag</span>}
                        </div>
                        <h3 className="sp-title">{p.name}</h3>
                        <p className="sp-local">{p.localName}</p>
                        <p className="sp-price-line">
                          <strong>{p.price}</strong> · <span>{p.weight}</span>
                        </p>
                      </div>
                    </div>

                    <p className="sp-tagline">{p.tagline}</p>

                    <div className="sp-meta-row">
                      <span className="sp-slug">/{p.slug}</span>
                      {p.razorpayItemId ? (
                        <span className="sp-rzp-linked" title="Linked to Razorpay Item">
                          ✓ Razorpay: <code>{p.razorpayItemId}</code>
                        </span>
                      ) : (
                        <span className="sp-rzp-unlinked">Not synced to Razorpay</span>
                      )}
                    </div>

                    <div className="sp-actions-row">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="sp-btn-edit"
                      >
                        ✏️ Edit Details / Price / Image
                      </button>
                      <Link href={`/${p.slug}`} target="_blank" className="sp-btn-view">
                        View ↗
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p)}
                        className="sp-btn-delete"
                        title="Remove product"
                      >
                        🗑 Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════ TAB 3: RAZORPAY INTEGRATION ═══════════════════════ */}
        {activeTab === "razorpay" && (
          <section className="staff-razorpay-section">
            <div className="rzp-status-grid">
              <div className="rzp-panel-card">
                <div className="rzp-card-head">
                  <h3>🔑 Razorpay Gateway Status</h3>
                  <span
                    className={`rzp-mode-pill ${
                      razorpayInfo.configured ? "connected" : "disconnected"
                    }`}
                  >
                    {razorpayInfo.configured
                      ? `● Connected (${razorpayInfo.mode})`
                      : "○ Not Configured"}
                  </span>
                </div>
                <p className="rzp-desc">
                  Key ID: <code>{razorpayInfo.keyIdMasked || "Not set"}</code>
                </p>
                <p className="rzp-desc">
                  Webhook Endpoint: <code>https://store.chakung.com/api/razorpay/webhook</code>
                </p>

                <div className="rzp-action-buttons">
                  <button
                    type="button"
                    onClick={handleSyncRazorpay}
                    disabled={syncingRazorpay}
                    className="sync-razorpay-btn"
                  >
                    {syncingRazorpay ? "Syncing Orders..." : "🔄 Sync All Orders from Razorpay"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncCatalogToRazorpay}
                    disabled={catalogSyncing}
                    className="add-product-btn"
                  >
                    {catalogSyncing
                      ? "Syncing Items..."
                      : "💳 Push Product Catalog to Razorpay Items"}
                  </button>
                </div>
              </div>

              <div className="rzp-panel-card">
                <h3>📦 Checkout &amp; Pricing Rules</h3>
                <ul className="rzp-rules-list">
                  <li>
                    <strong>Dynamic Price Verification:</strong> Every checkout order verifies
                    product prices &amp; weights server-side from your Staff Portal catalogue before
                    creating the Razorpay order.
                  </li>
                  <li>
                    <strong>Shipping Tier:</strong> ₹50 for cart subtotal ≥ ₹500, otherwise ₹70
                    Speed Post flat rate.
                  </li>
                  <li>
                    <strong>Razorpay Item Sync:</strong> Adding, editing, or removing a product in
                    the Products tab automatically creates/updates/deactivates its Item ID in
                    Razorpay.
                  </li>
                </ul>
              </div>
            </div>

            <div className="rzp-items-table-card">
              <h3>Linked Razorpay Items ({productsList.length})</h3>
              <div className="rzp-table-scroll">
                <table className="rzp-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Weight</th>
                      <th>Price</th>
                      <th>Razorpay Item ID</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsList.map((p) => (
                      <tr key={p.slug}>
                        <td>
                          <strong>{p.name}</strong>
                          <div className="rzp-sub-slug">/{p.slug}</div>
                        </td>
                        <td>{p.category}</td>
                        <td>{p.weight}</td>
                        <td>
                          <strong>{p.price}</strong>
                        </td>
                        <td>
                          {p.razorpayItemId ? (
                            <code className="rzp-item-code">{p.razorpayItemId}</code>
                          ) : (
                            <span className="rzp-pending-tag">Pending sync</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="sp-btn-edit"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ═══════════════════════ ADD / EDIT PRODUCT MODAL ═══════════════════════ */}
      {modalOpen && (
        <div className="staff-modal-backdrop" role="dialog" aria-modal="true">
          <div className="staff-modal-card">
            <div className="staff-modal-header">
              <h2>{editingSlug ? `Edit: ${formState.name}` : "Add New Product"}</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="staff-modal-close"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="staff-product-form">
              {formError && <div className="pin-error-msg">⚠️ {formError}</div>}

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="e.g. Organic Red Rice"
                  />
                </div>
                <div className="form-field">
                  <label>Local / Nepali Name</label>
                  <input
                    type="text"
                    value={formState.localName}
                    onChange={(e) => setFormState({ ...formState, localName: e.target.value })}
                    placeholder="e.g. Rato Chamal · रातो चामल"
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formState.priceNum}
                    onChange={(e) => setFormState({ ...formState, priceNum: e.target.value })}
                    placeholder="220"
                  />
                </div>
                <div className="form-field">
                  <label>Weight / Pack Size *</label>
                  <input
                    type="text"
                    required
                    value={formState.weight}
                    onChange={(e) => setFormState({ ...formState, weight: e.target.value })}
                    placeholder="500g pack"
                  />
                </div>
                <div className="form-field">
                  <label>Category *</label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        category: e.target.value as ProductFormState["category"],
                      })
                    }
                  >
                    <option value="Grain">Grain</option>
                    <option value="Legume">Legume</option>
                    <option value="Spice">Spice</option>
                    <option value="Ferment">Ferment</option>
                    <option value="Seed">Seed</option>
                  </select>
                </div>
              </div>

              {!editingSlug && (
                <div className="form-field">
                  <label>URL Slug (optional — auto-generated from name if blank)</label>
                  <input
                    type="text"
                    value={formState.slug}
                    onChange={(e) => setFormState({ ...formState, slug: e.target.value })}
                    placeholder="e.g. organic-red-rice"
                  />
                </div>
              )}

              {/* Image Upload & Gallery Picker */}
              <div className="form-image-box">
                <label>Product Image</label>
                <div className="form-image-row">
                  <div className="form-image-preview">
                    {formState.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formState.image} alt="Preview" />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>
                  <div className="form-image-controls">
                    <div className="form-image-actions">
                      <label className="upload-img-btn">
                        {uploadingImage ? "Uploading..." : "📷 Upload New Image"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          hidden
                        />
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value)
                            setFormState({ ...formState, image: e.target.value });
                        }}
                        className="gallery-select"
                      >
                        <option value="">Choose from existing /products/...</option>
                        {galleryImages.map((imgUrl) => (
                          <option key={imgUrl} value={imgUrl}>
                            {imgUrl.replace("/products/", "")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={formState.image}
                      onChange={(e) => setFormState({ ...formState, image: e.target.value })}
                      placeholder="/products/image.png or https://..."
                      className="image-url-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label>Tagline</label>
                <input
                  type="text"
                  value={formState.tagline}
                  onChange={(e) => setFormState({ ...formState, tagline: e.target.value })}
                  placeholder="Short one-line highlight"
                />
              </div>

              <div className="form-field">
                <label>Full Description</label>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Origin story, growing practices, nutritional benefits..."
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Altitude</label>
                  <input
                    type="text"
                    value={formState.altitude}
                    onChange={(e) => setFormState({ ...formState, altitude: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Harvest Season</label>
                  <input
                    type="text"
                    value={formState.harvestSeason}
                    onChange={(e) => setFormState({ ...formState, harvestSeason: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Tasting Notes (comma separated)</label>
                  <input
                    type="text"
                    value={formState.tastingNotes}
                    onChange={(e) => setFormState({ ...formState, tastingNotes: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Pairing Suggestions (comma separated)</label>
                  <input
                    type="text"
                    value={formState.pairingSuggestions}
                    onChange={(e) =>
                      setFormState({ ...formState, pairingSuggestions: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Traditional Uses (one per line)</label>
                <textarea
                  rows={2}
                  value={formState.traditionalUses}
                  onChange={(e) => setFormState({ ...formState, traditionalUses: e.target.value })}
                />
              </div>

              <div className="form-checkboxes-row">
                <label>
                  <input
                    type="checkbox"
                    checked={formState.featured}
                    onChange={(e) => setFormState({ ...formState, featured: e.target.checked })}
                  />
                  Featured on Homepage
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formState.organic}
                    onChange={(e) => setFormState({ ...formState, organic: e.target.checked })}
                  />
                  100% Organic
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formState.giTag}
                    onChange={(e) => setFormState({ ...formState, giTag: e.target.checked })}
                  />
                  GI Tagged
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formState.syncRazorpay}
                    onChange={(e) => setFormState({ ...formState, syncRazorpay: e.target.checked })}
                  />
                  Sync to Razorpay Item
                </label>
              </div>

              <div className="staff-modal-footer">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="staff-logout-btn"
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingProduct} className="store-btn-solid">
                  {savingProduct
                    ? "Saving..."
                    : editingSlug
                    ? "Save Changes"
                    : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
