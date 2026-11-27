// app/account/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { updateMemberProfile } from "@/lib/wix-auth";

type TabKey = "overview" | "orders" | "profile" | "loyalty";

interface CateringOrder {
  _id: string;
  _createdDate?: string;
  orderId?: string;
  title?: string;
  checkoutId?: string;
  packageTitle: string;
  pax: number;
  eventDate: string;
  eventTime: string;
  deliveryAddress: string;
  presentationTitle?: string;
  menuSelections?: Array<
    { category?: string; item?: string; name?: string } | string
  >;
  addOnsSummary?: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  deliveryFee?: number;
  serviceCharge: number;
  gstAmount: number;
  grandTotal: number;
  pointsEarned?: number;
  status: string;
}

interface LoyaltyAccount {
  title: string;
  memberId: string;
  email: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: string;
}

interface LoyaltyTransaction {
  _id?: string;
  _createdDate?: string;
  orderId: string;
  type: "EARN" | "REDEEM" | "ADJUST";
  points: number;
  amountSpent: string;
  description: string;
}

interface SavedProfileSnapshot {
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  addressLine1: string;
  unitNumber: string;
  postalCode: string;
}

function getStatusBadgeStyle(status: string) {
  const normalized = (status || "Confirmed").toLowerCase();
  if (normalized.includes("cancel")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (normalized.includes("complete") || normalized.includes("deliver")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (normalized.includes("prep") || normalized.includes("progress")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return "—";
  const parsed = new Date(
    dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`
  );
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const { isLoggedIn, loading, member, refreshMember, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Saved snapshot for comparison & "Saved Profile" card
  const [savedProfile, setSavedProfile] = useState<SavedProfileSnapshot>({
    firstName: "",
    lastName: "",
    phone: "",
    company: "",
    addressLine1: "",
    unitNumber: "",
    postalCode: "",
  });

  // Postcode lookup state
  const [lookingUpPostcode, setLookingUpPostcode] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saveError, setSaveError] = useState("");
  const lastFetchedPostcodeRef = useRef<string>("");

  // Save & Unsaved Navigation Warning modal state
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: "tab"; tab: TabKey } | { type: "logout" } | null
  >(null);

  // Orders & Loyalty state
  const [orders, setOrders] = useState<CateringOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount>({
    title: "",
    memberId: "",
    email: "",
    pointsBalance: 0,
    lifetimePoints: 0,
    tier: "Bronze",
  });
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<
    LoyaltyTransaction[]
  >([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (member) {
      const snapshot: SavedProfileSnapshot = {
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        phone: member.phone || "",
        company: member.company || "",
        addressLine1: member.defaultAddress?.addressLine1 || "",
        unitNumber: member.defaultAddress?.unitNumber || "",
        postalCode: member.defaultAddress?.postalCode || "",
      };
      setFirstName(snapshot.firstName);
      setLastName(snapshot.lastName);
      setPhone(snapshot.phone);
      setCompany(snapshot.company);
      setAddressLine1(snapshot.addressLine1);
      setUnitNumber(snapshot.unitNumber);
      setPostalCode(snapshot.postalCode);
      setSavedProfile(snapshot);
      lastFetchedPostcodeRef.current = snapshot.postalCode;
    }
  }, [member]);

  // Detect unsaved changes in Profile tab
  const hasUnsavedProfileChanges = useMemo(() => {
    return (
      firstName.trim() !== savedProfile.firstName.trim() ||
      lastName.trim() !== savedProfile.lastName.trim() ||
      phone.trim() !== savedProfile.phone.trim() ||
      company.trim() !== savedProfile.company.trim() ||
      addressLine1.trim() !== savedProfile.addressLine1.trim() ||
      unitNumber.trim() !== savedProfile.unitNumber.trim() ||
      postalCode.trim() !== savedProfile.postalCode.trim()
    );
  }, [
    firstName,
    lastName,
    phone,
    company,
    addressLine1,
    unitNumber,
    postalCode,
    savedProfile,
  ]);

  // Warn on browser tab close / refresh if profile has unsaved edits
  useEffect(() => {
    if (!hasUnsavedProfileChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedProfileChanges]);

  // Auto-lookup address when a 6-digit Singapore postal code is typed
  useEffect(() => {
    const cleanCode = postalCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setPostcodeError("");
      return;
    }
    if (cleanCode === lastFetchedPostcodeRef.current) {
      return;
    }

    let cancelled = false;
    async function lookupAddress() {
      setLookingUpPostcode(true);
      setPostcodeError("");
      try {
        const res = await fetch(
          `/api/postcode?postal=${encodeURIComponent(cleanCode)}`
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setPostcodeError(
            data?.error || "Address not found for this postal code."
          );
          return;
        }

        if (data?.streetAddress) {
          setAddressLine1(data.streetAddress);
          lastFetchedPostcodeRef.current = cleanCode;
        } else {
          setPostcodeError("No street address found for this postal code.");
        }
      } catch (err) {
        if (!cancelled) {
          setPostcodeError("Unable to look up postal code right now.");
        }
      } finally {
        if (!cancelled) {
          setLookingUpPostcode(false);
        }
      }
    }

    lookupAddress();
    return () => {
      cancelled = true;
    };
  }, [postalCode]);

  // Fetch Orders & Loyalty once member is available
  useEffect(() => {
    if (!member?.email) return;

    let cancelled = false;

    async function fetchAccountData() {
      setOrdersLoading(true);
      setLoyaltyLoading(true);

      try {
        const [ordersRes, loyaltyRes] = await Promise.all([
          fetch(`/api/orders?email=${encodeURIComponent(member!.email)}`),
          member?._id
            ? fetch(`/api/loyalty?memberId=${encodeURIComponent(member._id)}`)
            : Promise.resolve(null),
        ]);

        if (!cancelled && ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
        }

        if (!cancelled && loyaltyRes && loyaltyRes.ok) {
          const loyaltyData = await loyaltyRes.json();
          if (loyaltyData.account) setLoyaltyAccount(loyaltyData.account);
          if (Array.isArray(loyaltyData.transactions)) {
            setLoyaltyTransactions(loyaltyData.transactions);
          }
        }
      } catch (err) {
        console.error("Failed to load account dashboard data:", err);
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
          setLoyaltyLoading(false);
        }
      }
    }

    fetchAccountData();
    return () => {
      cancelled = true;
    };
  }, [member]);

  const sgTodayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const nextOrder = useMemo(() => {
    const upcoming = orders
      .filter((o) => {
        const status = (o.status || "").toLowerCase();
        return (
          o.eventDate &&
          o.eventDate >= sgTodayStr &&
          !status.includes("cancel") &&
          !status.includes("complete") &&
          !status.includes("deliver")
        );
      })
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    return upcoming[0] || null;
  }, [orders, sgTodayStr]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return orders;
    return orders.filter((o) => {
      const s = (o.status || "Confirmed").toLowerCase();
      if (orderFilter === "upcoming") {
        return (
          !s.includes("cancel") &&
          !s.includes("complete") &&
          !s.includes("deliver")
        );
      }
      if (orderFilter === "completed") {
        return s.includes("complete") || s.includes("deliver");
      }
      if (orderFilter === "cancelled") {
        return s.includes("cancel");
      }
      return true;
    });
  }, [orders, orderFilter]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-12 text-center text-gray-500">
        Loading account...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-12 text-center">
        <p className="text-sm text-gray-600">
          Unable to load your member profile.
        </p>
        <button
          type="button"
          onClick={() => refreshMember()}
          className="cursor-pointer rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  function validatePhoneInput(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return ""; // Allow blank if optional; return a required message if mandatory

    // Only allow '+' symbol, digits, and spaces (rejects '-', '(', ')', letters, or other symbols)
    if (!/^[+0-9\s]+$/.test(trimmed)) {
      return "Only '+' and numbers are allowed (e.g. +65 8240 9532).";
    }

    const compact = trimmed.replace(/\s+/g, "");

    // '+' may only appear once and strictly as the very first character
    if (compact.indexOf("+") > 0 || (compact.match(/\+/g)?.length ?? 0) > 1) {
      return "The '+' symbol can only be at the start of the country code.";
    }

    // Valid E.164 international format: '+' followed by 7 to 15 digits (first digit 1-9)
    if (!/^\+[1-9]\d{6,14}$/.test(compact)) {
      return "Enter a valid phone number with '+' and country code (e.g. +65 8240 9532).";
    }

    return "";
  }

  function validatePostalCodeInput(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return ""; // Allow blank if optional; return a required message if mandatory
    if (!/^\d{6}$/.test(trimmed)) {
      return "Enter a valid 6-digit Singapore postal code.";
    }
    return "";
  }

  const hasProfileValidationErrors = Boolean(
    phoneError ||
      postcodeError ||
      lookingUpPostcode ||
      validatePhoneInput(phone) ||
      validatePostalCodeInput(postalCode)
  );

  const persistProfile = async () => {
    setSavedNotice(false);
    setSaveError("");

    const nextPhoneError = validatePhoneInput(phone);
    const nextPostcodeError =
      postcodeError || validatePostalCodeInput(postalCode);

    setPhoneError(nextPhoneError);
    setPostcodeError(nextPostcodeError);

    if (nextPhoneError || nextPostcodeError || lookingUpPostcode) {
      setSaveError("Please fix the highlighted errors before saving.");
      return false;
    }

    setSaving(true);
    try {
      const nextSnapshot: SavedProfileSnapshot = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        company: company.trim(),
        addressLine1: addressLine1.trim(),
        unitNumber: unitNumber.trim(),
        postalCode: postalCode.trim(),
      };

      await updateMemberProfile(member._id, {
        firstName: nextSnapshot.firstName,
        lastName: nextSnapshot.lastName,
        phone: nextSnapshot.phone,
        company: nextSnapshot.company,
        defaultAddress: {
          addressLine1: nextSnapshot.addressLine1,
          unitNumber: nextSnapshot.unitNumber,
          postalCode: nextSnapshot.postalCode,
        },
      });
      await refreshMember();
      setSavedProfile(nextSnapshot);
      setSavedNotice(true);
      return true;
    } catch (err: any) {
      setSaveError(
        err?.message || "Failed to update profile. Please check your details."
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistProfile();
  };

  const resetProfileToSaved = () => {
    setFirstName(savedProfile.firstName);
    setLastName(savedProfile.lastName);
    setPhone(savedProfile.phone);
    setCompany(savedProfile.company);
    setAddressLine1(savedProfile.addressLine1);
    setUnitNumber(savedProfile.unitNumber);
    setPostalCode(savedProfile.postalCode);
    setPhoneError("");
    setPostcodeError("");
    setSaveError("");
    lastFetchedPostcodeRef.current = savedProfile.postalCode;
  };

  const requestTabChange = (targetTab: TabKey) => {
    if (targetTab === activeTab) return;
    if (activeTab === "profile" && hasUnsavedProfileChanges) {
      setPendingAction({ type: "tab", tab: targetTab });
      return;
    }
    setActiveTab(targetTab);
  };

  const requestLogout = () => {
    if (activeTab === "profile" && hasUnsavedProfileChanges) {
      setPendingAction({ type: "logout" });
      return;
    }
    executeLogout();
  };

  const executeLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleConfirmSaveAndContinue = async () => {
    await persistProfile();
    const action = pendingAction;
    setPendingAction(null);
    if (action?.type === "tab") {
      setActiveTab(action.tab);
    } else if (action?.type === "logout") {
      await executeLogout();
    }
  };

  const handleDiscardAndContinue = async () => {
    resetProfileToSaved();
    const action = pendingAction;
    setPendingAction(null);
    if (action?.type === "tab") {
      setActiveTab(action.tab);
    } else if (action?.type === "logout") {
      await executeLogout();
    }
  };

  const nextTierTarget =
    loyaltyAccount.tier === "Bronze"
      ? { name: "Silver", threshold: 1500 }
      : loyaltyAccount.tier === "Silver"
      ? { name: "Gold", threshold: 5000 }
      : null;

  const tierProgressPct = nextTierTarget
    ? Math.min(
        100,
        Math.round(
          (loyaltyAccount.lifetimePoints / nextTierTarget.threshold) * 100
        )
      )
    : 100;

  const navItems: Array<{ key: TabKey; label: string; badge?: number }> = [
    { key: "overview", label: "Overview" },
    { key: "orders", label: "Orders", badge: orders.length },
    { key: "profile", label: "Profile" },
    { key: "loyalty", label: "Loyalty" },
  ];

  const formattedSavedAddress = [
    savedProfile.addressLine1,
    savedProfile.unitNumber ? `#${savedProfile.unitNumber.replace(/^#/, "")}` : "",
    savedProfile.postalCode ? `Singapore ${savedProfile.postalCode}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* UNSAVED PROFILE WARNING MODAL */}
      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-warning-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2
              id="unsaved-warning-title"
              className="text-lg font-bold text-gray-900"
            >
              Unsaved Profile Changes
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You have unsaved changes in your profile. Would you like to save
              them before moving on?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-black"
              >
                Stay on Profile
              </button>
              <button
                type="button"
                onClick={handleDiscardAndContinue}
                className="cursor-pointer rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Discard Changes
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmSaveAndContinue}
                className="cursor-pointer rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8 md:flex-row md:items-start mt-20">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="w-full shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:sticky md:top-24 md:w-64">
          <div className="border-b border-gray-100 px-3 pb-4">
            <p className="truncate text-base font-bold text-gray-900">
              {savedProfile.firstName || savedProfile.lastName
                ? `${savedProfile.firstName} ${savedProfile.lastName}`.trim()
                : "Member Account"}
            </p>
            <p className="truncate text-xs text-gray-500">{member.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              <span>★ {loyaltyAccount.tier}</span>
              <span>·</span>
              <span>{loyaltyAccount.pointsBalance.toLocaleString()} pts</span>
            </div>
          </div>

          <nav
            aria-label="Account navigation"
            className="mt-3 flex flex-row gap-1 overflow-x-auto md:flex-col"
          >
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => requestTabChange(item.key)}
                  className={`flex cursor-pointer items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "bg-black font-semibold text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.key === "profile" && hasUnsavedProfileChanges && (
                      <span
                        title="Unsaved changes"
                        className="h-2 w-2 rounded-full bg-amber-400"
                      />
                    )}
                  </span>
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="my-1 hidden border-t border-gray-100 md:block" />

            <button
              type="button"
              onClick={requestLogout}
              className="flex cursor-pointer items-center whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Sign Out
            </button>
          </nav>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <section className="min-w-0 flex-1 space-y-6">
          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back
                    {savedProfile.firstName ? `, ${savedProfile.firstName}` : ""}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Manage your upcoming catering events, orders, and rewards.
                  </p>
                </div>
                <Link
                  href="/catering"
                  className="rounded-lg bg-black px-4 py-2.5 text-xs font-semibold text-white hover:bg-gray-800"
                >
                  + New Catering Order
                </Link>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Loyalty Balance
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {loyaltyLoading
                      ? "..."
                      : `${loyaltyAccount.pointsBalance.toLocaleString()} pts`}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    {loyaltyAccount.tier} Tier
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Total Catering Orders
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {ordersLoading ? "..." : orders.length}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    All-time bookings
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Next Event Date
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {ordersLoading
                      ? "..."
                      : nextOrder
                      ? formatDisplayDate(nextOrder.eventDate)
                      : "None scheduled"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {nextOrder
                      ? `${nextOrder.eventTime || "Time TBD"} · ${nextOrder.pax} pax`
                      : "Ready when you are"}
                  </p>
                </div>
              </div>

              {/* Next Upcoming Order Spotlight */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">
                    Next Upcoming Order
                  </h2>
                  {nextOrder && (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeStyle(
                        nextOrder.status
                      )}`}
                    >
                      {nextOrder.status || "Confirmed"}
                    </span>
                  )}
                </div>

                {ordersLoading ? (
                  <p className="mt-4 text-sm text-gray-500">
                    Checking upcoming events...
                  </p>
                ) : nextOrder ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Order #
                          {nextOrder.orderId ||
                            nextOrder.title ||
                            nextOrder._id.slice(0, 8)}
                        </p>
                        <h3 className="mt-0.5 text-lg font-bold text-gray-900">
                          {nextOrder.packageTitle || "Buffet Catering"} (
                          {nextOrder.pax} Pax)
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          <span className="font-medium text-gray-900">
                            {formatDisplayDate(nextOrder.eventDate)}
                          </span>
                          {nextOrder.eventTime
                            ? ` at ${nextOrder.eventTime}`
                            : ""}
                        </p>
                        {nextOrder.deliveryAddress && (
                          <p className="mt-1 text-xs text-gray-500">
                            Delivery: {nextOrder.deliveryAddress}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total Paid</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${Number(nextOrder.grandTotal || 0).toFixed(2)}
                        </p>
                        {Number(nextOrder.pointsEarned) > 0 && (
                          <p className="text-xs font-medium text-emerald-600">
                            +{nextOrder.pointsEarned} pts earned
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedOrderId(nextOrder._id);
                          requestTabChange("orders");
                        }}
                        className="cursor-pointer text-xs font-semibold text-black underline underline-offset-4 hover:text-gray-700"
                      >
                        View full order details →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl bg-gray-50 p-5 text-center">
                    <p className="text-sm text-gray-600">
                      You have no upcoming catering events scheduled.
                    </p>
                    <Link
                      href="/catering"
                      className="mt-3 inline-block rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                    >
                      Plan a Buffet Event
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Orders Preview */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">
                    Recent Orders
                  </h2>
                  {orders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => requestTabChange("orders")}
                      className="cursor-pointer text-xs font-semibold text-gray-600 hover:text-black"
                    >
                      View all ({orders.length}) →
                    </button>
                  )}
                </div>

                {ordersLoading ? (
                  <p className="mt-4 text-sm text-gray-500">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    No orders found yet.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-gray-100">
                    {orders.slice(0, 3).map((order) => (
                      <div
                        key={order._id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {order.packageTitle || "Buffet Catering"} ·{" "}
                            {order.pax} Pax
                          </p>
                          <p className="text-xs text-gray-500">
                            Event: {formatDisplayDate(order.eventDate)}{" "}
                            {order.eventTime ? `(${order.eventTime})` : ""} · #
                            {order.orderId ||
                              order.title ||
                              order._id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                              order.status
                            )}`}
                          >
                            {order.status || "Confirmed"}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            ${Number(order.grandTotal || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= ORDERS TAB ================= */}
          {activeTab === "orders" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Order History
                  </h1>
                  <p className="text-sm text-gray-500">
                    Track catering order status, menus, and tax invoices.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "All" },
                    { id: "upcoming", label: "Confirmed / Upcoming" },
                    { id: "completed", label: "Delivered / Completed" },
                    { id: "cancelled", label: "Cancelled" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderFilter(f.id)}
                      className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        orderFilter === f.id
                          ? "bg-black text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {ordersLoading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                  Loading your catering orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                  <p className="text-sm text-gray-600">
                    No orders match this status filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedOrderId === order._id;
                    const displayId =
                      order.orderId ||
                      order.title ||
                      order.checkoutId ||
                      order._id.slice(0, 8);

                    return (
                      <div
                        key={order._id}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-gray-500">
                                #{displayId}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeStyle(
                                  order.status
                                )}`}
                              >
                                {order.status || "Confirmed"}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                              {order.packageTitle || "Buffet Catering"} ·{" "}
                              {order.pax} Pax
                            </h3>
                            <p className="text-xs text-gray-600">
                              Event Date:{" "}
                              <span className="font-medium text-gray-900">
                                {formatDisplayDate(order.eventDate)}
                              </span>
                              {order.eventTime ? ` · ${order.eventTime}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-base font-bold text-gray-900">
                                ${Number(order.grandTotal || 0).toFixed(2)}
                              </p>
                              {Number(order.pointsEarned) > 0 && (
                                <p className="text-xs font-medium text-emerald-600">
                                  +{order.pointsEarned} pts
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrderId(isExpanded ? null : order._id)
                              }
                              className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-black"
                            >
                              {isExpanded ? "Hide Details" : "Details"}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="space-y-4 border-t border-gray-100 bg-gray-50/70 p-5 text-xs text-gray-700">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  Delivery Address
                                </p>
                                <p className="mt-1 text-gray-600">
                                  {order.deliveryAddress || "—"}
                                </p>
                                {order.presentationTitle && (
                                  <div>
                                    <p className="mt-2 text-gray-600">
                                      <span className="font-semibold text-gray-900">
                                        Presentation:
                                      </span>{" "}
                                    </p>
                                    <p>
                                      {order.presentationTitle}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1 rounded-xl border border-gray-200 bg-white p-3.5">
                                <div className="flex justify-between">
                                  <span>Subtotal</span>
                                  <span>
                                    ${Number(order.subtotal || 0).toFixed(2)}
                                  </span>
                                </div>
                                {Number(order.deliveryFee) > 0 && (
                                  <div className="flex justify-between">
                                    <span>Delivery &amp; Teardown</span>
                                    <span>
                                      ${Number(order.deliveryFee).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span>Service Charge (10%)</span>
                                  <span>
                                    ${Number(order.serviceCharge || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>GST (9%)</span>
                                  <span>
                                    ${Number(order.gstAmount || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-gray-100 pt-1.5 text-sm font-bold text-gray-900">
                                  <span>Grand Total</span>
                                  <span>
                                    ${Number(order.grandTotal || 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {Array.isArray(order.menuSelections) && order.menuSelections.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-900">Menu Selections</p>
                                <ul className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                  {order.menuSelections.map((sel: any, idx: number) => {
                                    if (typeof sel === "string") {
                                      return (
                                        <li key={idx} className="text-gray-600">
                                          • {sel}
                                        </li>
                                      );
                                    }
                                    const label =
                                      Array.isArray(sel.items) && sel.items.length > 0
                                        ? sel.items.join(", ")
                                        : sel.item || sel.title || sel.name || "";
                                    if (!label) return null;
                                    return (
                                      <li key={idx} className="text-gray-600">
                                        •{" "}
                                        {sel.category ? (
                                          <span className="font-medium text-gray-800">{sel.category}: </span>
                                        ) : null}
                                        {label}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}

                            {Array.isArray(order.addOnsSummary) &&
                              order.addOnsSummary.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    Add-Ons
                                  </p>
                                  <ul className="mt-1 space-y-1">
                                    {order.addOnsSummary.map((addon, idx) => (
                                      <li key={idx} className="text-gray-600">
                                        • {addon.name} × {addon.quantity} ($
                                        {Number(addon.price || 0).toFixed(2)})
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= PROFILE TAB ================= */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* SAVED VERSION SUMMARY CARD */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                    Saved Profile Details
                  </h2>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Active Default
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-gray-500">Full Name</dt>
                    <dd className="mt-0.5 font-semibold text-gray-900">
                      {savedProfile.firstName || savedProfile.lastName
                        ? `${savedProfile.firstName} ${savedProfile.lastName}`.trim()
                        : "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Contact Number</dt>
                    <dd className="mt-0.5 font-semibold text-gray-900">
                      {savedProfile.phone || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Email</dt>
                    <dd className="mt-0.5 font-semibold text-gray-900">
                      {member.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Company</dt>
                    <dd className="mt-0.5 font-semibold text-gray-900">
                      {savedProfile.company || "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-500">
                      Saved Delivery Address
                    </dt>
                    <dd className="mt-0.5 font-semibold text-gray-900">
                      {formattedSavedAddress || "No default address saved"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* EDIT PROFILE FORM */}
              <form
                onSubmit={handleSaveProfile}
                className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      Edit Profile &amp; Delivery Address
                    </h1>
                    <p className="text-xs text-gray-500">
                      Enter a 6-digit Singapore postal code to auto-fill your
                      street address.
                    </p>
                  </div>

                  {hasUnsavedProfileChanges && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      Unsaved changes
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setSavedNotice(false);
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setSavedNotice(false);
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+65 8240 9532"
                      value={phone}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        setPhone(rawValue);
                        setPhoneError(validatePhoneInput(rawValue));
                        setSavedNotice(false);
                        setSaveError("");
                      }}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                        phoneError ? "border-red-400 bg-red-50/30" : "border-gray-300"
                      }`}
                    />
                    {phoneError ? (
                      <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-gray-400">
                        Include country code with + (e.g. +65 8240 9532)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Company (Optional)
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        setSavedNotice(false);
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Postal Code (6 digits)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 238801"
                        value={postalCode}
                        onChange={(e) => {
                          setPostalCode(e.target.value.replace(/\D/g, ""));
                          setSavedNotice(false);
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      {lookingUpPostcode && (
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">
                          Finding...
                        </span>
                      )}
                    </div>
                    {postcodeError && (
                      <p className="mt-1 text-xs text-red-600">
                        {postcodeError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Unit / Floor
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 04-12"
                      value={unitNumber}
                      onChange={(e) => {
                        setUnitNumber(e.target.value);
                        setSavedNotice(false);
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Street &amp; Building
                    </label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => {
                        setAddressLine1(e.target.value);
                        setSavedNotice(false);
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {saveError ? (
                    <span className="text-xs font-medium text-red-600">{saveError}</span>
                  ) : savedNotice ? (
                    <span className="text-xs font-medium text-emerald-600">
                      ✓ Profile updated!
                    </span>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2.5">
                    {hasUnsavedProfileChanges && (
                      <button
                        type="button"
                        onClick={resetProfileToSaved}
                        className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:border-black"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={saving || !hasUnsavedProfileChanges}
                      className="cursor-pointer rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ================= LOYALTY TAB ================= */}
          {activeTab === "loyalty" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
                      {loyaltyAccount.tier} Member
                    </span>
                    <h1 className="mt-3 text-3xl font-bold text-gray-900">
                      {loyaltyLoading
                        ? "..."
                        : `${loyaltyAccount.pointsBalance.toLocaleString()} Points`}
                    </h1>
                    <p className="mt-1 text-xs text-gray-500">
                      Lifetime earned:{" "}
                      {loyaltyAccount.lifetimePoints.toLocaleString()} pts ·
                      Earn 1 point per $1 SGD spent
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-xs font-medium text-gray-600">
                    <span>{loyaltyAccount.tier}</span>
                    {nextTierTarget ? (
                      <span>
                        {Math.max(
                          0,
                          nextTierTarget.threshold -
                            loyaltyAccount.lifetimePoints
                        ).toLocaleString()}{" "}
                        pts to {nextTierTarget.name}
                      </span>
                    ) : (
                      <span>Highest Tier Unlocked</span>
                    )}
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-black transition-all"
                      style={{ width: `${tierProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900">
                  Points Transactions
                </h2>

                {loyaltyLoading ? (
                  <p className="mt-4 text-sm text-gray-500">
                    Loading points history...
                  </p>
                ) : loyaltyTransactions.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    No points transactions yet. Complete a catering order to
                    start earning rewards.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-gray-100">
                    {loyaltyTransactions.map((tx, idx) => {
                      const isEarn = tx.type === "EARN";
                      return (
                        <div
                          key={tx._id || `${tx.orderId}-${idx}`}
                          className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {tx.description ||
                                (isEarn
                                  ? `Earned points on Order #${tx.orderId.slice(0, 8)}`
                                  : "Points adjustment")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDisplayDate(tx._createdDate)}
                              {tx.amountSpent
                                ? ` · Spent ${tx.amountSpent}`
                                : ""}
                            </p>
                          </div>

                          <span
                            className={`text-sm font-bold ${
                              isEarn ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isEarn ? "+" : "-"}
                            {Math.abs(tx.points).toLocaleString()} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}