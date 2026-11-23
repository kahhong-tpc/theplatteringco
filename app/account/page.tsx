// app/account/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateMemberProfile } from "@/lib/wix-auth";
import Hero from "@/components/home/Hero";

export default function AccountPage() {
  const router = useRouter();
  const { isLoggedIn, loading, member, refreshMember, logout } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (member) {
      setFirstName(member.firstName);
      setLastName(member.lastName);
      setPhone(member.phone);
      setCompany(member.company || "");
      setAddressLine1(member.defaultAddress?.addressLine1 || "");
      setUnitNumber(member.defaultAddress?.unitNumber || "");
      setPostalCode(member.defaultAddress?.postalCode || "");
    }
  }, [member]);

  if (loading) {
    return (
        <div className="mx-auto max-w-2xl p-12 text-center text-gray-500">
        Loading profile...
        </div>
    );
    }

    if (!member) {
    return (
        <div className="mx-auto max-w-2xl p-12 text-center space-y-4">
        <p className="text-sm text-gray-600">Unable to load your member profile.</p>
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);

    try {
      await updateMemberProfile(member._id, {
        firstName,
        lastName,
        phone,
        company,
        defaultAddress: { addressLine1, unitNumber, postalCode },
      });
      await refreshMember();
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 space-y-6">
        <Hero />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-sm text-gray-500">{member.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold hover:border-black"
        >
          Log Out
        </button>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold">Profile &amp; Default Delivery Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Company (Optional)</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Postal Code</label>
            <input
              type="text"
              maxLength={6}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Unit / Floor</label>
            <input
              type="text"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700">Street &amp; Building</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedNotice ? (
            <span className="text-xs font-medium text-emerald-600">✓ Profile updated!</span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:bg-gray-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}