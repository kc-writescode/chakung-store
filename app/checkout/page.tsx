"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCart } from "@/context/cart-context";
import { getPriceNumber } from "@/content/products";
import {
  INDIAN_STATES_AND_UTS,
  getEstimatedTransitNote,
  inferStateFromPincode,
  isValidIndianPincode,
  normalizeIndianPhone,
  normalizeIndianState,
} from "@/lib/indian-address";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface AddressFormState {
  name: string;
  phone: string;
  email: string;
  pincode: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
}

interface PincodeLookupState {
  status: "idle" | "loading" | "found" | "fallback" | "error";
  state: string;
  city: string;
  district: string;
  division: string;
  postOffices: string[];
  message: string;
}

const SAVED_ADDRESS_KEY = "chakung_saved_checkout_v1";

const INITIAL_FORM: AddressFormState = {
  name: "",
  phone: "",
  email: "",
  pincode: "",
  state: "",
  city: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
};

const INITIAL_PIN_STATE: PincodeLookupState = {
  status: "idle",
  state: "",
  city: "",
  district: "",
  division: "",
  postOffices: [],
  message: "",
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function composeFullAddress(form: AddressFormState): string {
  const parts = [form.addressLine1.trim(), form.addressLine2.trim()];
  const cleanLandmark = form.landmark.trim().replace(/^near\s+/i, "");
  if (cleanLandmark) {
    parts.push(`Near ${cleanLandmark}`);
  }
  return parts.filter(Boolean).join(", ");
}

export default function CheckoutPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart, isHydrated } =
    useCart();
  const router = useRouter();

  const [form, setForm] = useState<AddressFormState>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AddressFormState, string>>
  >({});
  const [pinLookup, setPinLookup] =
    useState<PincodeLookupState>(INITIAL_PIN_STATE);
  const [showAllLocalities, setShowAllLocalities] = useState(false);

  const [savedAddress, setSavedAddress] = useState<AddressFormState | null>(
    null
  );
  const [saveForNextTime, setSaveForNextTime] = useState(true);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);

  // Track values that were auto-filled by PIN lookup so we never overwrite manual user edits
  const lastAutoStateRef = useRef<string>("");
  const lastAutoCityRef = useRef<string>("");
  const pinAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) {
      setRazorpayReady(true);
    }

    try {
      const raw = localStorage.getItem(SAVED_ADDRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalizedState = normalizeIndianState(parsed?.state);
        if (
          parsed &&
          typeof parsed.name === "string" &&
          isValidIndianPincode(String(parsed.pincode || "")) &&
          normalizedState
        ) {
          setSavedAddress({
            name: String(parsed.name || ""),
            phone: normalizeIndianPhone(String(parsed.phone || "")),
            email: String(parsed.email || ""),
            pincode: String(parsed.pincode || ""),
            state: normalizedState,
            city: String(parsed.city || ""),
            addressLine1: String(parsed.addressLine1 || ""),
            addressLine2: String(parsed.addressLine2 || ""),
            landmark: String(parsed.landmark || ""),
          });
        }
      }
    } catch {
      // Ignore malformed localStorage
    }
  }, []);

  // Cleanup any in-flight pincode fetch on unmount
  useEffect(() => {
    return () => {
      pinAbortRef.current?.abort();
    };
  }, []);

  const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);
  const shippingDiscountThreshold = 500;
  const shippingDiscountMet = subtotal >= shippingDiscountThreshold;
  const shippingFee = items.length === 0 ? 0 : shippingDiscountMet ? 50 : 70;
  const grandTotal = subtotal + shippingFee;

  const cleanPhoneDigits = normalizeIndianPhone(form.phone);
  const contactComplete =
    form.name.trim().length > 0 &&
    cleanPhoneDigits.length === 10 &&
    isValidEmail(form.email);

  const addressComplete =
    isValidIndianPincode(form.pincode) &&
    Boolean(form.state) &&
    form.city.trim().length > 0 &&
    form.addressLine1.trim().length >= 2 &&
    form.addressLine2.trim().length >= 2;

  const detectedPinState =
    pinLookup.state ||
    (isValidIndianPincode(form.pincode)
      ? inferStateFromPincode(form.pincode)
      : "");
  const stateMismatch = Boolean(
    detectedPinState && form.state && detectedPinState !== form.state
  );

  const clearFieldError = (field: keyof AddressFormState) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (errorMessage) setErrorMessage("");
  };

  const runPincodeLookup = async (pin: string) => {
    pinAbortRef.current?.abort();

    if (pin.length < 6) {
      setPinLookup(INITIAL_PIN_STATE);
      setShowAllLocalities(false);
      return;
    }

    if (!isValidIndianPincode(pin)) {
      setPinLookup({
        status: "error",
        state: "",
        city: "",
        district: "",
        division: "",
        postOffices: [],
        message: "Indian PIN codes must be 6 digits starting with 1–8.",
      });
      return;
    }

    // Immediate zero-latency deterministic state fill
    const instantState = inferStateFromPincode(pin);
    if (instantState) {
      setForm((prev) => {
        const canUpdateState =
          !prev.state || prev.state === lastAutoStateRef.current;
        if (canUpdateState) {
          lastAutoStateRef.current = instantState;
          return { ...prev, state: instantState };
        }
        return prev;
      });
      clearFieldError("state");
    }

    const controller = new AbortController();
    pinAbortRef.current = controller;

    setPinLookup({
      status: "loading",
      state: instantState,
      city: "",
      district: "",
      division: "",
      postOffices: [],
      message: "Checking PIN code directory...",
    });

    try {
      const res = await fetch(`/api/pincode?pin=${encodeURIComponent(pin)}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (controller.signal.aborted) return;

      if (!res.ok || !data.valid) {
        setPinLookup({
          status: "error",
          state: instantState,
          city: "",
          district: "",
          division: "",
          postOffices: [],
          message:
            data.error || "Could not verify PIN code. Please double-check.",
        });
        return;
      }

      const resolvedState =
        normalizeIndianState(data.state) || instantState || "";
      const resolvedCity = String(data.city || "").trim();
      const postOffices: string[] = Array.isArray(data.postOffices)
        ? data.postOffices
        : [];

      setForm((prev) => {
        if (prev.pincode !== pin) return prev;
        let nextState = prev.state;
        let nextCity = prev.city;

        if (
          resolvedState &&
          (!prev.state || prev.state === lastAutoStateRef.current)
        ) {
          nextState = resolvedState;
          lastAutoStateRef.current = resolvedState;
        }

        if (
          resolvedCity &&
          (!prev.city || prev.city === lastAutoCityRef.current)
        ) {
          nextCity = resolvedCity;
          lastAutoCityRef.current = resolvedCity;
        }

        return {
          ...prev,
          state: nextState,
          city: nextCity,
        };
      });

      if (resolvedState) clearFieldError("state");
      if (resolvedCity) clearFieldError("city");

      setShowAllLocalities(false);
      setPinLookup({
        status: data.source === "india-post" ? "found" : "fallback",
        state: resolvedState,
        city: resolvedCity,
        district: String(data.district || ""),
        division: String(data.division || ""),
        postOffices,
        message:
          data.source === "india-post"
            ? `${[resolvedCity || data.division, resolvedState].filter(Boolean).join(", ")}`
            : resolvedState
            ? `State detected: ${resolvedState}`
            : "PIN format valid",
      });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setPinLookup({
        status: instantState ? "fallback" : "idle",
        state: instantState,
        city: "",
        district: "",
        division: "",
        postOffices: [],
        message: instantState
          ? `State detected: ${instantState}`
          : "",
      });
    }
  };

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const field = name as keyof AddressFormState;

    if (field === "pincode") {
      const digitsOnly = value.replace(/[^0-9]/g, "").slice(0, 6);
      setForm((prev) => ({ ...prev, pincode: digitsOnly }));
      clearFieldError("pincode");
      void runPincodeLookup(digitsOnly);
      return;
    }

    if (field === "phone") {
      // Allow comfortable typing/pasting while stripping non-phone punctuation
      const digits = value.replace(/[^0-9]/g, "");
      const cleaned =
        digits.length > 10 ? normalizeIndianPhone(digits) : digits;
      setForm((prev) => ({ ...prev, phone: cleaned.slice(0, 10) }));
      clearFieldError("phone");
      return;
    }

    if (field === "state") {
      // Mark manual state choice so subsequent lookup preserves user intent if they intentionally override
      lastAutoStateRef.current = "__manual__";
    }

    if (field === "city") {
      lastAutoCityRef.current = "__manual__";
    }

    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const handleUseSavedAddress = () => {
    if (!savedAddress) return;
    lastAutoStateRef.current = savedAddress.state;
    lastAutoCityRef.current = savedAddress.city;
    setForm(savedAddress);
    setFieldErrors({});
    setErrorMessage("");
    void runPincodeLookup(savedAddress.pincode);
  };

  const handleForgetSavedAddress = () => {
    setSavedAddress(null);
    try {
      localStorage.removeItem(SAVED_ADDRESS_KEY);
    } catch {
      // Ignore
    }
  };

  const handleSelectLocality = (locality: string) => {
    setForm((prev) => {
      const current = prev.addressLine2.trim();
      if (!current) {
        return { ...prev, addressLine2: locality };
      }
      if (current.toLowerCase().includes(locality.toLowerCase())) {
        return prev;
      }
      return { ...prev, addressLine2: `${current}, ${locality}` };
    });
    clearFieldError("addressLine2");
  };

  const handleUseDivisionCity = (division: string) => {
    lastAutoCityRef.current = division;
    setForm((prev) => ({ ...prev, city: division }));
    clearFieldError("city");
  };

  const validateForm = (): {
    errors: Partial<Record<keyof AddressFormState, string>>;
    firstField: keyof AddressFormState | null;
    summary: string;
  } => {
    const errors: Partial<Record<keyof AddressFormState, string>> = {};

    if (!form.name.trim()) {
      errors.name = "Please enter the recipient's full name.";
    }
    if (cleanPhoneDigits.length !== 10) {
      errors.phone = "Enter a valid 10-digit Indian mobile number.";
    }
    if (!form.email.trim() || !isValidEmail(form.email)) {
      errors.email = "Enter a valid email address for receipts & tracking.";
    }
    if (!isValidIndianPincode(form.pincode)) {
      errors.pincode = "Enter a valid 6-digit Indian PIN code.";
    }
    if (!form.state) {
      errors.state = "Please select your delivery State or Union Territory.";
    }
    if (!form.city.trim()) {
      errors.city = "Enter your city, town, or district.";
    }
    if (form.addressLine1.trim().length < 2) {
      errors.addressLine1 = "Enter flat, house no., or building details.";
    }
    if (form.addressLine2.trim().length < 2) {
      errors.addressLine2 = "Enter your street, area, colony, or village.";
    }

    const fieldOrder: Array<keyof AddressFormState> = [
      "name",
      "phone",
      "email",
      "pincode",
      "state",
      "city",
      "addressLine1",
      "addressLine2",
    ];
    const firstField = fieldOrder.find((key) => Boolean(errors[key])) || null;
    const summary = firstField ? errors[firstField] || "" : "";

    return { errors, firstField, summary };
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setErrorMessage(
        "Your cart is empty. Please add items before checking out."
      );
      return;
    }

    const { errors, firstField, summary } = validateForm();
    if (firstField) {
      setFieldErrors(errors);
      setErrorMessage(summary);
      const targetEl = document.getElementById(firstField);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        targetEl.focus({ preventScroll: true });
      }
      return;
    }

    if (!window.Razorpay) {
      setErrorMessage(
        "Razorpay payment gateway is still loading. Please try again in a moment."
      );
      return;
    }

    // Persist address locally for faster repeat orders if opted in
    if (saveForNextTime) {
      const toSave: AddressFormState = {
        ...form,
        phone: cleanPhoneDigits,
      };
      try {
        localStorage.setItem(SAVED_ADDRESS_KEY, JSON.stringify(toSave));
        setSavedAddress(toSave);
      } catch {
        // Ignore storage errors
      }
    }

    const customerPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: cleanPhoneDigits,
      address: composeFullAddress(form),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
    };

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Create order on backend
      const orderPayload = {
        items: items.map((item) => ({
          slug: item.product.slug,
          quantity: item.quantity,
        })),
        customer: customerPayload,
      };

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to initiate payment order.");
      }

      const pendingOrderContext = {
        orderId: orderData.orderId,
        items: orderData.items,
        subtotal: orderData.subtotal,
        shipping: orderData.shipping,
        total: orderData.total,
        customer: customerPayload,
        date: new Date().toISOString(),
      };
      sessionStorage.setItem(
        "last_order_details",
        JSON.stringify(pendingOrderContext)
      );

      // 2. Configure and open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Chakung Store",
        description: "Himalayan Village Organic Produce",
        image: "https://store.chakung.com/products/dalle-khursani.jpg",
        order_id: orderData.orderId,
        prefill: {
          name: customerPayload.name,
          email: customerPayload.email,
          contact: cleanPhoneDigits,
        },
        notes: {
          address: `${customerPayload.address}, ${customerPayload.city}, ${customerPayload.state} - ${customerPayload.pincode}`,
        },
        theme: {
          color: "#1a3328",
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                orderDetails: pendingOrderContext,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              clearCart();
              pendingOrderContext.orderId = response.razorpay_order_id;
              sessionStorage.setItem(
                "last_order_details",
                JSON.stringify({
                  ...pendingOrderContext,
                  paymentId: response.razorpay_payment_id,
                })
              );

              router.push(
                `/order-success?order_id=${encodeURIComponent(
                  response.razorpay_order_id
                )}&payment_id=${encodeURIComponent(response.razorpay_payment_id)}`
              );
            } else {
              router.push(
                `/order-failure?order_id=${encodeURIComponent(
                  response.razorpay_order_id
                )}&reason=${encodeURIComponent(
                  verifyData.error || "Payment verification failed"
                )}`
              );
            }
          } catch (err: any) {
            router.push(
              `/order-failure?order_id=${encodeURIComponent(
                response.razorpay_order_id
              )}&reason=${encodeURIComponent(
                err.message || "Network error during verification"
              )}`
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setIsSubmitting(false);
        const failReason =
          response.error?.description || "Payment was declined or failed";
        router.push(
          `/order-failure?order_id=${encodeURIComponent(
            orderData.orderId
          )}&reason=${encodeURIComponent(failReason)}`
        );
      });

      rzp.open();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(
        err.message || "An unexpected error occurred. Please try again."
      );
    }
  };

  const whatsappBackupLink = `https://wa.me/916295034036?text=${encodeURIComponent(
    `Hello Chakung Store, I have an enquiry regarding my checkout:\nItems: ${items
      .map((i) => `${i.product.name} x${i.quantity}`)
      .join(", ")}\nTotal: ₹${grandTotal}\nDelivery to: ${
      form.name || "Customer"
    }${form.state ? `, ${form.state}` : ""}${
      form.pincode ? ` - ${form.pincode}` : ""
    }`
  )}`;

  const previewAddress = composeFullAddress(form);
  const showPreview = Boolean(
    form.name.trim() ||
      previewAddress ||
      form.city.trim() ||
      form.state ||
      form.pincode
  );
  const visibleLocalities = showAllLocalities
    ? pinLookup.postOffices
    : pinLookup.postOffices.slice(0, 6);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />

      <main className="checkout-page">
        <div className="store-wrap">
          {/* Breadcrumb */}
          <div className="product-breadcrumb">
            <Link href="/">← Store Home</Link>
            <span>/</span>
            <Link href="/#products">Catalogue</Link>
            <span>/</span>
            <span>Secure Checkout</span>
          </div>

          <div className="checkout-header-title">
            <h1>Himalayan Produce Checkout</h1>
            <p className="checkout-subtitle">
              Hand-packed in Chakung, West Sikkim &amp; delivered pan-India via
              India Post Speed Post.
            </p>

            {items.length > 0 && (
              <div className="checkout-steps-bar" aria-label="Checkout steps">
                <div
                  className={`checkout-step-pill ${
                    contactComplete ? "is-done" : "is-active"
                  }`}
                >
                  <span className="step-num">
                    {contactComplete ? "✓" : "1"}
                  </span>
                  <span>Contact</span>
                </div>
                <span className="step-divider" aria-hidden="true" />
                <div
                  className={`checkout-step-pill ${
                    addressComplete
                      ? "is-done"
                      : contactComplete
                      ? "is-active"
                      : ""
                  }`}
                >
                  <span className="step-num">
                    {addressComplete ? "✓" : "2"}
                  </span>
                  <span>Delivery Address</span>
                </div>
                <span className="step-divider" aria-hidden="true" />
                <div
                  className={`checkout-step-pill ${
                    contactComplete && addressComplete ? "is-active" : ""
                  }`}
                >
                  <span className="step-num">3</span>
                  <span>Payment</span>
                </div>
              </div>
            )}
          </div>

          {!isHydrated ? (
            <div className="checkout-empty-box">
              <p className="checkout-subtitle">Loading your basket...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="checkout-empty-box">
              <span className="empty-icon">🏔️</span>
              <h2>Your basket is empty</h2>
              <p>
                Add fresh organic chillies, spices, or heritage grains from our
                village catalogue.
              </p>
              <Link href="/#products" className="store-btn-solid">
                Explore the Catalogue
              </Link>
            </div>
          ) : (
            <div className="checkout-grid">
              {/* Left Column: Delivery Form */}
              <div className="checkout-form-panel">
                {/* One-tap Saved Address Card */}
                {savedAddress && (
                  <div className="saved-address-card">
                    <div className="saved-address-copy">
                      <span className="saved-address-kicker">
                        ⚡ Saved Delivery Address
                      </span>
                      <p className="saved-address-line">
                        <strong>{savedAddress.name}</strong> · +91{" "}
                        {savedAddress.phone}
                      </p>
                      <p className="saved-address-sub">
                        {[
                          savedAddress.addressLine1,
                          savedAddress.addressLine2,
                          savedAddress.city,
                          savedAddress.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}{" "}
                        - <strong>{savedAddress.pincode}</strong>
                      </p>
                    </div>
                    <div className="saved-address-actions">
                      <button
                        type="button"
                        onClick={handleUseSavedAddress}
                        className="saved-fill-btn"
                      >
                        Use Address
                      </button>
                      <button
                        type="button"
                        onClick={handleForgetSavedAddress}
                        className="saved-forget-btn"
                        aria-label="Remove saved address"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handlePayment}
                  className="checkout-form"
                  noValidate
                >
                  {/* ── SECTION 1: CONTACT DETAILS ── */}
                  <div className="form-section">
                    <div className="section-heading-row">
                      <h3 className="section-title">1. Delivery Contact</h3>
                      {contactComplete && (
                        <span className="section-complete-tag">✓ Complete</span>
                      )}
                    </div>

                    <div className="form-row two-col">
                      <div
                        className={`form-group ${
                          fieldErrors.name ? "has-error" : ""
                        }`}
                      >
                        <label htmlFor="name">Full Name *</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          autoComplete="name"
                          placeholder="Enter your full name"
                          required
                          value={form.name}
                          onChange={handleFieldChange}
                        />
                        {fieldErrors.name && (
                          <span className="field-error-text">
                            {fieldErrors.name}
                          </span>
                        )}
                      </div>

                      <div
                        className={`form-group ${
                          fieldErrors.phone ? "has-error" : ""
                        }`}
                      >
                        <label htmlFor="phone">Mobile Number *</label>
                        <div className="phone-input-group">
                          <span className="phone-prefix" aria-hidden="true">
                            +91
                          </span>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            maxLength={14}
                            placeholder="10-digit mobile number"
                            required
                            value={form.phone}
                            onChange={handleFieldChange}
                          />
                        </div>
                        {fieldErrors.phone ? (
                          <span className="field-error-text">
                            {fieldErrors.phone}
                          </span>
                        ) : (
                          <span className="field-hint">
                            For Speed Post SMS &amp; delivery call
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`form-group ${
                        fieldErrors.email ? "has-error" : ""
                      }`}
                    >
                      <label htmlFor="email">Email Address *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        autoComplete="email"
                        placeholder="Enter your email address"
                        required
                        value={form.email}
                        onChange={handleFieldChange}
                      />
                      {fieldErrors.email ? (
                        <span className="field-error-text">
                          {fieldErrors.email}
                        </span>
                      ) : (
                        <span className="field-hint">
                          For Razorpay receipt &amp; consignment tracking
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── SECTION 2: PINCODE-FIRST SHIPPING ADDRESS ── */}
                  <div className="form-section">
                    <div className="section-heading-row">
                      <h3 className="section-title">2. Shipping Address</h3>
                      {addressComplete && (
                        <span className="section-complete-tag">✓ Complete</span>
                      )}
                    </div>

                    <p className="address-helper-banner">
                      Enter your 6-digit PIN code first — we&apos;ll
                      automatically detect your State, City &amp; local areas.
                    </p>

                    {/* Row 1: PIN Code + State / UT */}
                    <div className="form-row two-col">
                      <div
                        className={`form-group ${
                          fieldErrors.pincode || pinLookup.status === "error"
                            ? "has-error"
                            : ""
                        }`}
                      >
                        <label htmlFor="pincode">PIN Code (6 digits) *</label>
                        <div className="pincode-input-wrap">
                          <input
                            type="text"
                            id="pincode"
                            name="pincode"
                            inputMode="numeric"
                            autoComplete="postal-code"
                            maxLength={6}
                            placeholder="Enter 6-digit PIN code"
                            required
                            value={form.pincode}
                            onChange={handleFieldChange}
                          />
                          {pinLookup.status === "loading" && (
                            <span className="pin-status-badge is-loading">
                              Checking...
                            </span>
                          )}
                          {(pinLookup.status === "found" ||
                            pinLookup.status === "fallback") && (
                            <span className="pin-status-badge is-ok">
                              ✓ Valid
                            </span>
                          )}
                        </div>

                        {fieldErrors.pincode ? (
                          <span className="field-error-text">
                            {fieldErrors.pincode}
                          </span>
                        ) : pinLookup.status === "error" ? (
                          <span className="field-error-text">
                            {pinLookup.message}
                          </span>
                        ) : pinLookup.message &&
                          pinLookup.status !== "loading" ? (
                          <span className="pin-detected-note">
                            📍 {pinLookup.message}
                          </span>
                        ) : (
                          <span className="field-hint">
                            Auto-detects your delivery state &amp; city
                          </span>
                        )}
                      </div>

                      <div
                        className={`form-group ${
                          fieldErrors.state ? "has-error" : ""
                        }`}
                      >
                        <label htmlFor="state">
                          State / Union Territory *
                        </label>
                        <select
                          id="state"
                          name="state"
                          autoComplete="address-level1"
                          required
                          value={form.state}
                          onChange={handleFieldChange}
                          className={!form.state ? "is-placeholder" : ""}
                        >
                          <option value="">
                            Select State / Union Territory
                          </option>
                          {INDIAN_STATES_AND_UTS.map((stateName) => (
                            <option key={stateName} value={stateName}>
                              {stateName}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.state ? (
                          <span className="field-error-text">
                            {fieldErrors.state}
                          </span>
                        ) : form.state ? (
                          <span className="field-hint">
                            {getEstimatedTransitNote(form.state)}
                          </span>
                        ) : (
                          <span className="field-hint">
                            Auto-selected from PIN or pick manually
                          </span>
                        )}
                      </div>
                    </div>

                    {stateMismatch && (
                      <div className="state-mismatch-alert" role="status">
                        <span>
                          ⚠️ PIN <strong>{form.pincode}</strong> normally
                          belongs to <strong>{detectedPinState}</strong>, while
                          selected state is <strong>{form.state}</strong>.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            lastAutoStateRef.current = detectedPinState;
                            setForm((prev) => ({
                              ...prev,
                              state: detectedPinState,
                            }));
                            clearFieldError("state");
                          }}
                          className="mismatch-fix-btn"
                        >
                          Switch to {detectedPinState}
                        </button>
                      </div>
                    )}

                    {/* Row 2: City / Town / District */}
                    <div
                      className={`form-group ${
                        fieldErrors.city ? "has-error" : ""
                      }`}
                    >
                      <label htmlFor="city">City / Town / District *</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        autoComplete="address-level2"
                        placeholder="Enter city, town, or district"
                        required
                        value={form.city}
                        onChange={handleFieldChange}
                      />
                      {fieldErrors.city && (
                        <span className="field-error-text">
                          {fieldErrors.city}
                        </span>
                      )}
                      {pinLookup.division &&
                        pinLookup.district &&
                        pinLookup.division.toLowerCase() !==
                          pinLookup.district.toLowerCase() &&
                        form.city.trim().toLowerCase() !==
                          pinLookup.division.toLowerCase() && (
                          <div className="locality-chips-row">
                            <span className="chips-label">City suggestion:</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUseDivisionCity(pinLookup.division)
                              }
                              className="locality-chip"
                            >
                              Use {pinLookup.division}
                            </button>
                          </div>
                        )}
                    </div>

                    {/* Row 3: Flat / House No., Building */}
                    <div
                      className={`form-group ${
                        fieldErrors.addressLine1 ? "has-error" : ""
                      }`}
                    >
                      <label htmlFor="addressLine1">
                        Flat / House No., Building, Floor *
                      </label>
                      <input
                        type="text"
                        id="addressLine1"
                        name="addressLine1"
                        autoComplete="address-line1"
                        placeholder="Flat, House no., Building, Floor"
                        required
                        value={form.addressLine1}
                        onChange={handleFieldChange}
                      />
                      {fieldErrors.addressLine1 && (
                        <span className="field-error-text">
                          {fieldErrors.addressLine1}
                        </span>
                      )}
                    </div>

                    {/* Row 4: Street / Area / Village + 1-tap Post Office chips */}
                    <div
                      className={`form-group ${
                        fieldErrors.addressLine2 ? "has-error" : ""
                      }`}
                    >
                      <label htmlFor="addressLine2">
                        Street, Area, Colony / Village *
                      </label>
                      <input
                        type="text"
                        id="addressLine2"
                        name="addressLine2"
                        autoComplete="address-line2"
                        placeholder="Street, Area, Colony, Sector, or Village"
                        required
                        value={form.addressLine2}
                        onChange={handleFieldChange}
                      />
                      {fieldErrors.addressLine2 && (
                        <span className="field-error-text">
                          {fieldErrors.addressLine2}
                        </span>
                      )}

                      {pinLookup.postOffices.length > 0 && (
                        <div className="locality-chips-wrap">
                          <span className="chips-label">
                            Tap area from PIN {form.pincode}:
                          </span>
                          <div className="locality-chips-row">
                            {visibleLocalities.map((po) => {
                              const alreadyIncluded = form.addressLine2
                                .toLowerCase()
                                .includes(po.toLowerCase());
                              return (
                                <button
                                  key={po}
                                  type="button"
                                  onClick={() => handleSelectLocality(po)}
                                  className={`locality-chip ${
                                    alreadyIncluded ? "is-selected" : ""
                                  }`}
                                >
                                  {alreadyIncluded ? `✓ ${po}` : `+ ${po}`}
                                </button>
                              );
                            })}
                            {pinLookup.postOffices.length > 6 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAllLocalities((prev) => !prev)
                                }
                                className="locality-chip is-more"
                              >
                                {showAllLocalities
                                  ? "Show less"
                                  : `+${pinLookup.postOffices.length - 6} more`}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Row 5: Landmark (Optional) */}
                    <div className="form-group">
                      <label htmlFor="landmark">
                        Landmark{" "}
                        <span className="optional-label">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        id="landmark"
                        name="landmark"
                        placeholder="e.g. Near Metro Station, School, or Market"
                        value={form.landmark}
                        onChange={handleFieldChange}
                      />
                    </div>

                    {/* Save Address Toggle */}
                    <label className="save-address-checkbox">
                      <input
                        type="checkbox"
                        checked={saveForNextTime}
                        onChange={(e) => setSaveForNextTime(e.target.checked)}
                      />
                      <span>
                        Save this address on my device for faster next checkout
                      </span>
                    </label>

                    {/* Live Parcel Label Preview */}
                    {showPreview && (
                      <div className="parcel-preview-card">
                        <div className="parcel-preview-head">
                          <span>📦 Parcel Label Preview</span>
                          {contactComplete && addressComplete ? (
                            <span className="parcel-ready-pill">
                              ✓ Ready for Speed Post
                            </span>
                          ) : (
                            <span className="parcel-pending-pill">
                              Verify details
                            </span>
                          )}
                        </div>
                        <p className="parcel-preview-name">
                          {form.name.trim() || "Recipient Name"}
                          {cleanPhoneDigits ? ` · +91 ${cleanPhoneDigits}` : ""}
                        </p>
                        <p className="parcel-preview-addr">
                          {previewAddress || "House / Flat, Street / Area"}
                        </p>
                        <p className="parcel-preview-region">
                          {[form.city.trim(), form.state]
                            .filter(Boolean)
                            .join(", ") || "City, State"}
                          {form.pincode ? ` – ${form.pincode}` : ""}
                        </p>
                      </div>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="checkout-error-banner" role="alert">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  <div className="checkout-submit-area">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="store-btn-solid store-btn-large checkout-pay-btn"
                    >
                      {isSubmitting ? (
                        <span>Connecting to Razorpay...</span>
                      ) : (
                        <span>Pay ₹{grandTotal} with Razorpay</span>
                      )}
                    </button>

                    <div className="payment-security-badges">
                      <span>🔒 256-Bit SSL Encryption</span>
                      <span>💳 UPI · Cards · Netbanking</span>
                      <span>🏔️ 100% Organic Sikkim Guarantee</span>
                    </div>

                    <div className="or-whatsapp-box">
                      <span>
                        Have a question about your order or delivery?
                      </span>
                      <a
                        href={whatsappBackupLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whatsapp-alt-link"
                      >
                        Enquire via WhatsApp →
                      </a>
                    </div>
                  </div>
                </form>
              </div>

              {/* Right Column: Order Summary */}
              <div className="checkout-summary-panel">
                <button
                  type="button"
                  onClick={() => setMobileSummaryOpen((prev) => !prev)}
                  className="mobile-summary-toggle"
                  aria-expanded={mobileSummaryOpen}
                >
                  <span className="mobile-summary-left">
                    <strong>Order Summary</strong>
                    <span className="mobile-summary-count">
                      {totalUnits} {totalUnits === 1 ? "item" : "items"} ·{" "}
                      {mobileSummaryOpen ? "Hide" : "View"} ▾
                    </span>
                  </span>
                  <span className="mobile-summary-total">₹{grandTotal}</span>
                </button>

                <div
                  className={`summary-card ${
                    mobileSummaryOpen ? "is-mobile-open" : ""
                  }`}
                >
                  <h3 className="summary-card-title">Order Summary</h3>

                  <ul className="checkout-items-list">
                    {items.map(({ product, quantity }) => {
                      const unitPrice = getPriceNumber(product.price);
                      const itemTotal = unitPrice * quantity;
                      return (
                        <li key={product.slug} className="checkout-item-row">
                          <div className="item-thumb-col">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={54}
                                height={54}
                                unoptimized={product.image.startsWith("data:")}
                                className="item-thumb"
                              />
                            ) : (
                              <div className="item-placeholder">🌱</div>
                            )}
                          </div>
                          <div className="item-details-col">
                            <span className="item-name">{product.name}</span>
                            <span className="item-meta">
                              {product.weight} · ₹{unitPrice} each
                            </span>
                            <div className="item-stepper-mini">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(product.slug, quantity - 1)
                                }
                                className="mini-btn"
                                aria-label={`Decrease quantity of ${product.name}`}
                              >
                                –
                              </button>
                              <span className="mini-qty">{quantity}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(product.slug, quantity + 1)
                                }
                                className="mini-btn"
                                aria-label={`Increase quantity of ${product.name}`}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(product.slug)}
                                className="mini-remove"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="item-price-col">
                            <span>₹{itemTotal}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="summary-calculations">
                    <div className="calc-row">
                      <span>Items Subtotal</span>
                      <span className="calc-val">₹{subtotal}</span>
                    </div>
                    <div className="calc-row">
                      <span>
                        Speed Post Shipping
                        {shippingDiscountMet && (
                          <span className="free-badge-pill">
                            ₹50 discounted rate applied
                          </span>
                        )}
                      </span>
                      <span className="calc-val">
                        {shippingDiscountMet && (
                          <span
                            style={{
                              textDecoration: "line-through",
                              color: "var(--muted)",
                              marginRight: "6px",
                              fontSize: "12px",
                            }}
                          >
                            ₹70
                          </span>
                        )}
                        ₹{shippingFee}
                      </span>
                    </div>
                    <div className="calc-row total-row">
                      <span>Total Due</span>
                      <span className="total-val">₹{grandTotal}</span>
                    </div>
                  </div>

                  <div className="ridge-guarantee-box">
                    <p className="guarantee-title">🌱 From Chakung Ridge</p>
                    <p className="guarantee-text">
                      We hand-pack your harvest directly in West Sikkim. Shipped
                      via India Post Speed Post with tracking updates sent to
                      your mobile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
