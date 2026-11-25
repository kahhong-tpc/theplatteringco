"use client";

import { useState, useEffect, useMemo } from "react";
import { wixClient } from "@/lib/wixClient";
import { TierRule, PresentationOption } from "@/lib/catering";
import Step2AddOns, { SelectedAddOn } from "@/components/addon/addon";
import type { AddOnGroupItem } from "@/lib/wix-addon";
import { useAuth } from "@/context/AuthContext";

export interface Dish {
  _id: string;
  data?: {
    title?: string;
    category?: string;
    description?: string;
  };
  title?: string;
  category?: string;
  description?: string;
}

export interface AddOnProduct {
  _id: string;
  name: string;
  description?: string;
  price: number;
  formattedPrice: string;
}

export interface BlackoutDateRule {
  _id: string;
  startDate: string; // "YYYY-MM-DD"
  endDate?: string;  // "YYYY-MM-DD"
  categoryIds?: string[];
  reason?: string;
}

const DEFAULT_RULE: TierRule = {
  limitProduct: 3,
  beverages: 1,
  minPax: 20,
  maxPax: 300,
  startTime: "08:00",
  endTime: "19:00",
  sortOrder: 999,
  paxInterval: 5,
};

const STORAGE_KEY = "catering_guest_draft";
const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CateringBuilder({
  tiers,
  dishes,
  tierRules = {},
  presentations = [],
  addOns = [],
  addOnGroups = [],
  categorySlug,
  drinkMenus = {},
  blackoutDates = [],
}: {
  tiers: any[];
  dishes: Dish[];
  tierRules?: Record<string, TierRule>;
  presentations?: PresentationOption[];
  addOns?: AddOnProduct[];
  addOnGroups?: AddOnGroupItem[];
  categorySlug?: string;
  drinkMenus?: Record<string, string[]>;
  blackoutDates?: BlackoutDateRule[];
}) {
  // Match Store Product name against CMS title (longest-first prevents partial collisions)
  const getRuleForTier = (tier: any): TierRule => {
    const productName = (tier?.name || "").toLowerCase();
    const matchedKey = Object.keys(tierRules)
      .sort((a, b) => b.length - a.length)
      .find((title) => productName.includes(title.toLowerCase()));

    return matchedKey ? tierRules[matchedKey] : DEFAULT_RULE;
  };

  // Calculate dynamic presentation fee based on guest count brackets
  const getPresentationPrice = (
    pres: PresentationOption | undefined,
    guestCount: number
  ): number => {
    if (!pres || !pres.priceTiers || pres.priceTiers.length === 0) return 0;

    const matchedBracket = pres.priceTiers.find(
      (bracket) => guestCount <= bracket.maxPax
    );
    return matchedBracket
      ? matchedBracket.price
      : pres.priceTiers[pres.priceTiers.length - 1].price;
  };

  // 4-Step Wizard State (1 = Menu, 2 = Presentation & Add-Ons, 3 = Address & Payment, 4 = Confirmation)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [confirmedCheckoutId, setConfirmedCheckoutId] = useState<string | null>(
    null
  );

  // Step 1 State: Package, Items, Pax & Event Date/Time
  const [selectedTier, setSelectedTier] = useState(tiers[0]);
  const [selectedCanapes, setSelectedCanapes] = useState<string[]>([]);
  const [selectedBeverages, setSelectedBeverages] = useState<string[]>([]);
  const [pax, setPax] = useState<number>(() => getRuleForTier(tiers[0]).minPax);
  const [eventDate, setEventDate] = useState<string>("");
  const [eventTime, setEventTime] = useState<string>("12:00");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Step 2 State: Table Styling & Nested Add-Ons
  const [selectedPresentationId, setSelectedPresentationId] = useState<string>(
    presentations[0]?._id || ""
  );
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);
  const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>(
    {}
  );

  // Step 3 State: Delivery Address, Contact & Payment Mode
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [addressLine1, setAddressLine1] = useState<string>("");
  const [unitNumber, setUnitNumber] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [lookingUpPostal, setLookingUpPostal] = useState<boolean>(false);
  const [postalError, setPostalError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string>("");

  // Step 4 Loyalty Award Feedback State
  const [loyaltyAward, setLoyaltyAward] = useState<{
    awarded: boolean;
    pointsEarned?: number;
    newBalance?: number;
    tier?: string;
  } | null>(null);

  const { isLoggedIn, member } = useAuth();

  useEffect(() => {
    if (!member) return;
    if (!contactName)
      setContactName(`${member.firstName} ${member.lastName}`.trim());
    if (!contactEmail) setContactEmail(member.email);
    if (!contactPhone) setContactPhone(member.phone);
    if (member.defaultAddress) {
      if (!postalCode) setPostalCode(member.defaultAddress.postalCode);
      if (!addressLine1) setAddressLine1(member.defaultAddress.addressLine1);
      if (!unitNumber) setUnitNumber(member.defaultAddress.unitNumber);
    }
  }, [member]);

  // Sync default presentation if presentations prop updates
  useEffect(() => {
    if (!selectedPresentationId && presentations.length > 0) {
      setSelectedPresentationId(presentations[0]._id);
    }
  }, [presentations, selectedPresentationId]);

  // Unified Mount Effect: Step 4 redirect handling & Step 3 sessionStorage restore
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get("step");

    if (stepParam === "4") {
      setStep(4);
      setConfirmedCheckoutId(params.get("checkoutId"));
      return;
    }

    const savedDraft = sessionStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.selectedTierId) {
          const matchedTier = tiers.find((t) => t._id === draft.selectedTierId);
          if (matchedTier) setSelectedTier(matchedTier);
        }
        if (draft.pax) setPax(draft.pax);
        if (draft.selectedCanapes) setSelectedCanapes(draft.selectedCanapes);
        if (draft.selectedBeverages)
          setSelectedBeverages(draft.selectedBeverages);
        if (draft.selectedPresentationId)
          setSelectedPresentationId(draft.selectedPresentationId);
        if (draft.selectedAddOns) setSelectedAddOns(draft.selectedAddOns);
        if (draft.eventDate) setEventDate(draft.eventDate);
        if (draft.eventTime) setEventTime(draft.eventTime);
        if (draft.contactName) setContactName(draft.contactName);
        if (draft.contactEmail) setContactEmail(draft.contactEmail);
        if (draft.contactPhone) setContactPhone(draft.contactPhone);
        if (draft.postalCode) setPostalCode(draft.postalCode);
        if (draft.addressLine1) setAddressLine1(draft.addressLine1);
        if (draft.unitNumber) setUnitNumber(draft.unitNumber);
        if (draft.deliveryNotes) setDeliveryNotes(draft.deliveryNotes);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    if (stepParam === "3") {
      setStep(3);
    }
  }, [tiers]);

  // Award Loyalty Points on Step 4 Return
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const currentStep = params.get("step");
    const checkoutId = params.get("checkoutId");
    const urlTotal = Number(params.get("total") || 0);

    if (currentStep !== "4" || !checkoutId || urlTotal <= 0 || !isLoggedIn) {
      return;
    }

    // Read draft contact details (or member profile) before/after redirect
    let draftName = contactName;
    let draftEmail = contactEmail;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        draftName ||= parsed.contactName || "";
        draftEmail ||= parsed.contactEmail || "";
      }
    } catch {}

    const finalName =
      draftName ||
      `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
    const finalEmail = draftEmail || member?.email || "";

    fetch("/api/loyalty/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkoutId,
        fallbackTotal: urlTotal,
        name: finalName,
        email: finalEmail,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        sessionStorage.removeItem(STORAGE_KEY);
        if (data?.awarded) {
          setLoyaltyAward(data);
        }
      })
      .catch((err) => console.error("Loyalty award error:", err));
  }, [isLoggedIn, member]);

  // Singapore 6-Digit Postal Code Lookup
  useEffect(() => {
    const cleaned = postalCode.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      setPostalError("");
      return;
    }

    const controller = new AbortController();

    async function lookupSingaporePostal() {
      setLookingUpPostal(true);
      setPostalError("");

      try {
        const res = await fetch(`/api/postcode?postal=${cleaned}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          setPostalError(data.error || "Postal code not found.");
          return;
        }

        if (data.streetAddress) {
          setAddressLine1(data.streetAddress);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setPostalError("Could not auto-fill address. Please enter manually.");
        }
      } finally {
        setLookingUpPostal(false);
      }
    }

    lookupSingaporePostal();
    return () => controller.abort();
  }, [postalCode]);

  // Resolve Detailed Selected Add-Ons (from CMS AddOnGroups / AddOnOptions)
  const resolvedSelectedAddOns = useMemo(() => {
    return selectedAddOns
      .map((sel) => {
        const group = addOnGroups.find((g) =>
          g.options.some((o) => o._id === sel.optionId)
        );
        const option = group?.options.find((o) => o._id === sel.optionId);
        if (!group || !option) return null;

        const isFreeFlowBar =
          group.selectionMode === "single" &&
          (group.title.toLowerCase().includes("free flow") ||
            Boolean(option.customPickers) ||
            option.inclusions.length > 0);

        const effectiveBarPax = Math.max(20, sel.barPax ?? pax);
        const effectiveBarHours = Math.max(2, sel.barHours ?? 2);
        const effectiveBarStart = sel.barStartTime || eventTime;

        const lineTotal = isFreeFlowBar
          ? option.price * effectiveBarPax * effectiveBarHours
          : option.pricingType === "per_pax"
          ? option.price * pax
          : option.price * sel.quantity;

        const barScheduleDetail = isFreeFlowBar
          ? `${effectiveBarPax} pax, ${effectiveBarHours} hrs, starts ${effectiveBarStart}`
          : "";

        const drinkDetails = Object.entries(sel.pickedItems || {})
          .filter(([, list]) => list.length > 0)
          .map(([key, list]) => `${key}: ${list.join(", ")}`)
          .join(" | ");

        const pickedDetails = [barScheduleDetail, drinkDetails]
          .filter(Boolean)
          .join(" • ");

        return {
          ...sel,
          groupTitle: group.title,
          optionTitle: option.title,
          pricingType: option.pricingType,
          unitPrice: option.price,
          lineTotal,
          pickedDetails,
          isFreeFlowBar,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [selectedAddOns, addOnGroups, pax, eventTime]);

  if (!tiers || tiers.length === 0) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-center text-gray-500">
        No catering packages found. Check that your products are visible in Wix
        Stores.
      </div>
    );
  }

  const rules = getRuleForTier(selectedTier);
  const paxStep = Math.max(1, Number(rules?.paxInterval || 5));

  const normalizePax = (rawValue: number) => {
    const min = rules.minPax || 20;
    const max = rules.maxPax || 500;
    const clamped = Math.min(max, Math.max(min, rawValue));
    const offset = clamped - min;
    const snapped = min + Math.round(offset / paxStep) * paxStep;
    return Math.min(max, Math.max(min, snapped));
  };

  // Local YYYY-MM-DD (avoids UTC off-by-one shifts in Singapore UTC+8)
  const minSelectableDate = useMemo(() => {
    return formatLocalDate(new Date());
  }, []);

  const getBlackoutForDate = (date: string) => {
    const tierCats: string[] = selectedTier?.collectionIds || [];

    return (
      blackoutDates.find((rule) => {
        const start = rule.startDate;
        const end = rule.endDate || rule.startDate;
        if (!start || date < start || date > end) return false;
        if (!Array.isArray(rule.categoryIds)) return false;
        if (rule.categoryIds.length === 0) return true;

        return rule.categoryIds.some(
          (id) =>
            tierCats.includes(id) ||
            (categorySlug && id.toLowerCase() === categorySlug.toLowerCase())
        );
      }) || null
    );
  };

  // Check if eventDate falls inside any blackout window for the selected tier's category
  const activeBlackout = useMemo(() => {
    return eventDate ? getBlackoutForDate(eventDate) : null;
  }, [eventDate, selectedTier, blackoutDates, categorySlug]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const leadingDays = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from<number>({ length: leadingDays }).fill(0),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [calendarMonth]);

  useEffect(() => {
    if (!eventDate) return;
    const [year, month] = eventDate.split("-").map(Number);
    if (year && month) setCalendarMonth(new Date(year, month - 1, 1));
  }, [eventDate]);

  // Normalize flat vs nested Wix CMS dish items
  const normalizedDishes = dishes.map((d) => ({
    _id: d._id,
    title: d.data?.title || d.title || "",
    category: d.data?.category || d.category || "",
    description: d.data?.description || d.description || "",
  }));

  const canapeList = normalizedDishes.filter(
    (d) => d.category.toLowerCase() === "canape"
  );
  const beverageList = normalizedDishes.filter(
    (d) => d.category.toLowerCase() === "beverage"
  );

  // Strict Backward-Only Step Navigation
  const canNavigateToStep = (targetStep: 1 | 2 | 3 | 4): boolean => {
    if (step === 4) return false;
    return targetStep < step;
  };

  const handleTierChange = (tier: any) => {
    const nextRules = getRuleForTier(tier);
    const nextTierCats: string[] = tier?.collectionIds || [];

    setSelectedTier(tier);
    setSelectedCanapes([]);
    setSelectedBeverages([]);
    setPax(nextRules.minPax);

    // Strip any previously selected add-ons that aren't allowed for the new tier's categories
    setSelectedAddOns((prev) =>
      prev.filter((sel) => {
        const group = addOnGroups.find((g) =>
          g.options.some((o) => o._id === sel.optionId)
        );
        if (!group) return false;
        if (group.applicableCategoryIds.length === 0) return true;
        return group.applicableCategoryIds.some(
          (catId) =>
            nextTierCats.includes(catId) ||
            (categorySlug && catId.toLowerCase() === categorySlug.toLowerCase())
        );
      })
    );

    if (eventTime < nextRules.startTime || eventTime > nextRules.endTime) {
      setEventTime(nextRules.startTime);
    }
  };

  const toggleDish = (
    title: string,
    current: string[],
    setFn: (val: string[]) => void,
    max: number
  ) => {
    if (current.includes(title)) {
      setFn(current.filter((item) => item !== title));
    } else if (current.length < max) {
      setFn([...current, title]);
    }
  };

  const updateAddOnQty = (productId: string, delta: number) => {
    setAddOnQuantities((prev) => {
      const next = Math.max(0, (prev[productId] || 0) + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Step 1 Validation
  const isPastDate = Boolean(eventDate && eventDate < minSelectableDate);
  const isDateAvailable = eventDate.trim().length > 0 && !isPastDate && !activeBlackout;
  const isValidPax =
    pax >= rules.minPax &&
    pax <= rules.maxPax &&
    (pax - rules.minPax) % paxStep === 0;
  const isValidTime = eventTime >= rules.startTime && eventTime <= rules.endTime;
  const isStep1Complete =
    selectedCanapes.length === rules.limitProduct &&
    selectedBeverages.length === rules.beverages &&
    isValidPax &&
    isValidTime &&
    isDateAvailable;
    // eventDate.trim().length > 0;

  // Step 2 Selection & Validation
  const activePresentation =
    presentations.find((p) => p._id === selectedPresentationId) ||
    presentations[0];
  const isStep2Complete =
    presentations.length === 0 || Boolean(activePresentation);

  // Step 3 Validation
  const isStep3AddressValid =
    contactName.trim().length > 0 &&
    contactEmail.includes("@") &&
    contactPhone.trim().length >= 8 &&
    addressLine1.trim().length > 0 &&
    postalCode.trim().length >= 5;

  // Pricing Calculations
  const baseUnitPrice = Number(selectedTier?.priceData?.price || 0);
  const packageSubtotal = baseUnitPrice * pax;
  const presentationPrice = getPresentationPrice(activePresentation, pax);

  const legacyActiveAddOns = addOns
    .filter((item) => (addOnQuantities[item._id] || 0) > 0)
    .map((item) => ({
      ...item,
      quantity: addOnQuantities[item._id],
      lineTotal: item.price * addOnQuantities[item._id],
    }));

  const legacyAddOnsSubtotal = legacyActiveAddOns.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );
  const cmsAddOnsSubtotal = resolvedSelectedAddOns.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );
  const grandTotal =
    packageSubtotal +
    presentationPrice +
    legacyAddOnsSubtotal +
    cmsAddOnsSubtotal;

  // Step 3 -> Step 4: Create Direct Checkout & Redirect to Wix Payment
  const handleProceedToPayment = async (asGuest: boolean) => {
    if (!isStep1Complete || !isStep3AddressValid || !selectedTier) return;
    setLoading(true);
    setCheckoutError("");

    try {
      // 1. Trigger Wix Member OAuth Login if user selected "Log In & Pay"
      if (!asGuest && !isLoggedIn && !wixClient.auth.loggedIn()) {
        const loginRequestData = await wixClient.auth.generateOAuthData(
          window.location.href
        );
        localStorage.setItem(
          "oauthRedirectData",
          JSON.stringify(loginRequestData)
        );
        const { authUrl } = await wixClient.auth.getAuthUrl(loginRequestData);
        window.location.href = authUrl;
        return;
      }

      // 2. Build browser-safe catalogItems array for Wix Cart V2
      const lineItems: any[] = [
        {
          catalogReference: {
            appId: WIX_STORES_APP_ID,
            catalogItemId: selectedTier._id,
          },
          quantity: pax,
        },
      ];

      // 3. Add Table Presentation Styling as its own separate line item
      const presentationProductId =
        activePresentation?.productId ||
        presentations.find((p) => p.productId)?.productId ||
        process.env.NEXT_PUBLIC_WIX_TABLE_STYLING_PRODUCT_ID;

      if (presentationPrice > 0) {
        if (!presentationProductId) {
          throw new Error(
            "Missing Store productId for Table Presentation in CateringPresentations CMS."
          );
        }

        lineItems.push({
          catalogReference: {
            appId: WIX_STORES_APP_ID,
            catalogItemId: presentationProductId,
          },
          quantity: Math.round(presentationPrice),
        });
      }

      // 4. Add CMS Add-Ons as a separate line item (using the Catering Add-Ons $1 product)
      const customAddOnProductId =
        process.env.NEXT_PUBLIC_WIX_CUSTOM_ADDON_PRODUCT_ID;

      const addOnsDollarQty = resolvedSelectedAddOns.reduce(
        (sum, addOn) =>
          addOn.lineTotal > 0 ? sum + Math.round(addOn.lineTotal) : sum,
        0
      );

      if (addOnsDollarQty > 0) {
        if (!customAddOnProductId) {
          throw new Error(
            "Missing NEXT_PUBLIC_WIX_CUSTOM_ADDON_PRODUCT_ID for add-on checkout."
          );
        }

        lineItems.push({
          catalogReference: {
            appId: WIX_STORES_APP_ID,
            catalogItemId: customAddOnProductId,
          },
          quantity: addOnsDollarQty,
        });
      }

      // 5. Add legacy Store Product Add-Ons if any
      legacyActiveAddOns.forEach((addOn) => {
        lineItems.push({
          catalogReference: {
            appId: WIX_STORES_APP_ID,
            catalogItemId: addOn._id,
          },
          quantity: addOn.quantity,
        });
      });

      const [firstName, ...restName] = contactName.trim().split(" ");
      const lastName = restName.join(" ") || "-";

      const fullStreetAddress = [addressLine1.trim(), unitNumber.trim()]
        .filter(Boolean)
        .join(", ");

      // 6. Create isolated checkout directly (no restricted customItems)
      const createdCart = await wixClient.cartV2.createCart({
        catalogItems: lineItems,
        cart: {
          customerInfo: {
            email: contactEmail.trim(),
            firstName,
            lastName,
            phone: contactPhone.trim(),
          },
          deliveryInfo: {
            address: {
              addressLine1: fullStreetAddress,
              postalCode: postalCode.trim(),
              country: "SG",
            },
          },
          paymentInfo: {
            billingAddress: {
              addressLine1: fullStreetAddress,
              postalCode: postalCode.trim(),
              country: "SG",
            },
          },
        },
      });

      if (!createdCart?._id) {
        throw new Error("Failed to create Cart V2.");
      }

      const exactCheckoutTotal = Math.round(grandTotal);

      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("step", "4");
      returnUrl.searchParams.set("checkoutId", createdCart._id);
      returnUrl.searchParams.set("total", String(exactCheckoutTotal));

      // Save current selections before leaving Next.js
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedTierId: selectedTier._id,
          pax,
          selectedCanapes,
          selectedBeverages,
          selectedPresentationId,
          selectedAddOns,
          eventDate,
          eventTime,
          contactName,
          contactEmail,
          contactPhone,
          postalCode,
          addressLine1,
          unitNumber,
          deliveryNotes,
        })
      );

      // Success URL -> Step 4
      const successUrl = new URL(
        window.location.origin + window.location.pathname
      );
      successUrl.searchParams.set("step", "4");
      successUrl.searchParams.set("checkoutId", createdCart._id);
      successUrl.searchParams.set("total", String(exactCheckoutTotal));

      const { redirectSession } =
        await wixClient.redirects.createRedirectSession({
          ecomCheckout: { checkoutId: createdCart._id },
          callbacks: {
            thankYouPageUrl: successUrl.toString(),
            postFlowUrl: returnUrl.toString(),
          },
        });

      if (redirectSession?.fullUrl) {
        window.location.href = redirectSession.fullUrl;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setCheckoutError(
        err?.message || "Unable to proceed to checkout. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { num: 1 as const, label: "1. Menu & Event" },
    { num: 2 as const, label: "2. Presentation & Add-Ons" },
    { num: 3 as const, label: "3. Address & Payment" },
    { num: 4 as const, label: "4. Confirmation" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* 4-Step Progress Bar (Backward-Only Clickable) */}
      <nav aria-label="Progress" className="border-b border-gray-200 pb-4">
        <ol className="grid grid-cols-2 gap-2 text-sm font-medium sm:grid-cols-4">
          {STEPS.map((item) => {
            const isCurrent = step === item.num;
            const isPast = step > item.num;
            const clickable = canNavigateToStep(item.num);

            return (
              <li key={item.num}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && setStep(item.num)}
                  className={`w-full rounded-lg px-3 py-2.5 text-center transition ${
                    isCurrent
                      ? "bg-black font-semibold text-white"
                      : clickable
                      ? "cursor-pointer bg-gray-100 text-black hover:bg-gray-200"
                      : isPast
                      ? "bg-gray-100 text-gray-500"
                      : "cursor-not-allowed text-gray-400"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* =========================================================
          STEPS 1–3: BUILDER + STICKY SUMMARY SIDEBAR
      ========================================================= */}
      {step !== 4 ? (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* LEFT COLUMN: Active Step Form (8 of 12 cols on desktop) */}
          <div className="space-y-8 lg:col-span-8">
            {step === 1 && (
              <div className="space-y-8">
                <section>
                  <h2 className="mb-3 text-xl font-bold">
                    Choose Your Package Tier
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {tiers.map((tier) => {
                      const active = tier._id === selectedTier?._id;
                      return (
                        <button
                          key={tier._id}
                          type="button"
                          onClick={() => handleTierChange(tier)}
                          className={`cursor-pointer rounded-xl border p-4 text-left transition ${
                            active
                              ? "border-black bg-black text-white"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <div className="font-semibold">
                            {tier.name.split("–")[0].trim()}
                          </div>
                          <div className="mt-1 text-sm opacity-80">
                            {tier.priceData?.formatted?.price} / pax
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Select Canapés</h2>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
                      {selectedCanapes.length} / {rules.limitProduct} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {canapeList.map((dish) => {
                      const checked = selectedCanapes.includes(dish.title);
                      const disabled =
                        !checked &&
                        selectedCanapes.length >= rules.limitProduct;
                      return (
                        <button
                          key={dish._id}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            toggleDish(
                              dish.title,
                              selectedCanapes,
                              setSelectedCanapes,
                              rules.limitProduct
                            )
                          }
                          className={`flex cursor-pointer items-start justify-between rounded-lg border p-4 text-left transition ${
                            checked
                              ? "border-black bg-gray-50 ring-1 ring-black"
                              : disabled
                              ? "cursor-not-allowed border-gray-100 opacity-40"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <div>
                            <div className="font-medium">{dish.title}</div>
                            {dish.description && (
                              <div className="mt-0.5 text-xs text-gray-500">
                                {dish.description}
                              </div>
                            )}
                          </div>
                          <span className="ml-2 text-lg font-bold">
                            {checked ? "✓" : "+"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Select Beverages</h2>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
                      {selectedBeverages.length} / {rules.beverages} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {beverageList.map((dish) => {
                      const checked = selectedBeverages.includes(dish.title);
                      const disabled =
                        !checked &&
                        selectedBeverages.length >= rules.beverages;
                      return (
                        <button
                          key={dish._id}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            toggleDish(
                              dish.title,
                              selectedBeverages,
                              setSelectedBeverages,
                              rules.beverages
                            )
                          }
                          className={`flex cursor-pointer items-start justify-between rounded-lg border p-4 text-left transition ${
                            checked
                              ? "border-black bg-gray-50 ring-1 ring-black"
                              : disabled
                              ? "cursor-not-allowed border-gray-100 opacity-40"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <div>
                            <div className="font-medium">{dish.title}</div>
                            {dish.description && (
                              <div className="mt-0.5 text-xs text-gray-500">
                                {dish.description}
                              </div>
                            )}
                          </div>
                          <span className="ml-2 text-lg font-bold">
                            {checked ? "✓" : "+"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* =========================================================
                STEP 2: TABLE PRESENTATION (PAX-SCALED) & OPTIONAL ADD-ONS
            ========================================================= */}
            {step === 2 && (
              <div className="space-y-8">
                <section>
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-bold">
                        Select Table Presentation
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Pricing scales automatically for your guest count (
                        {pax} pax).
                      </p>
                    </div>
                  </div>

                  {presentations.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                      No presentation options configured in Wix CMS yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {presentations.map((pres) => {
                        const active = pres._id === activePresentation?._id;
                        const cardPrice = getPresentationPrice(pres, pax);

                        return (
                          <button
                            key={pres._id}
                            type="button"
                            onClick={() => setSelectedPresentationId(pres._id)}
                            className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition ${
                              active
                                ? "border-black bg-gray-50 ring-1 ring-black"
                                : "border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            <div>
                              {pres.imageUrl && (
                                <img
                                  src={pres.imageUrl}
                                  alt={pres.title}
                                  className="mb-3 h-32 w-full rounded-lg object-cover"
                                />
                              )}
                              <div className="flex items-center justify-between font-semibold">
                                <span>{pres.title}</span>
                                {active && <span>✓</span>}
                              </div>
                              {pres.description && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {pres.description}
                                </p>
                              )}
                            </div>

                            <div className="mt-3 border-t border-gray-100 pt-2 text-sm font-bold text-black">
                              {cardPrice === 0
                                ? "Complimentary"
                                : `+$${cardPrice.toFixed(2)} (${pax} pax)`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="mb-1 text-xl font-bold">Optional Add-Ons</h2>
                  <p className="mb-4 text-sm text-gray-600">
                    Enhance your event with extra service staff, equipment, or
                    beverage upgrades.
                  </p>

                  {addOnGroups.length > 0 ? (
                    <Step2AddOns
                      addOnGroups={addOnGroups}
                      selectedTierCollectionIds={
                        selectedTier?.collectionIds || []
                      }
                      currentCategorySlug={categorySlug}
                      pax={pax}
                      paxInterval={paxStep}
                      eventTime={eventTime}
                      selectedAddOns={selectedAddOns}
                      onChangeSelectedAddOns={setSelectedAddOns}
                      drinkMenus={drinkMenus}
                    />
                  ) : addOns.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                      No optional add-ons available for this menu.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addOns.map((item) => {
                        const qty = addOnQuantities[item._id] || 0;
                        return (
                          <div
                            key={item._id}
                            className="flex items-center justify-between rounded-xl border border-gray-200 p-4"
                          >
                            <div>
                              <div className="font-semibold">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500">
                                  {item.description}
                                </div>
                              )}
                              <div className="mt-1 text-sm font-medium text-gray-800">
                                {item.formattedPrice}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => updateAddOnQty(item._id, -1)}
                                disabled={qty === 0}
                                className="h-8 w-8 cursor-pointer rounded-lg border border-gray-300 font-bold disabled:opacity-30"
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-semibold">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateAddOnQty(item._id, 1)}
                                className="h-8 w-8 cursor-pointer rounded-lg border border-gray-300 font-bold hover:border-black"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Step 2 Footer */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold hover:border-black"
                  >
                    ← Back to Step 1
                  </button>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Estimated Total:{" "}
                      <span className="text-lg font-bold text-black">
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!isStep2Complete}
                      onClick={() => setStep(3)}
                      className="mt-2 cursor-pointer rounded-lg bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      Next: Address & Payment →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                STEP 3: DELIVERY ADDRESS, LOGIN VS GUEST & PAYMENT
            ========================================================= */}
            {step === 3 && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-xl font-bold">
                    Delivery Address & Contact Details
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Where should our team deliver and set up your catering?
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Alex Tan"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="alex@company.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+65 9123 4567"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Postal Code *{" "}
                        {lookingUpPostal && (
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            Looking up...
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        placeholder="018956"
                        value={postalCode}
                        onChange={(e) =>
                          setPostalCode(e.target.value.replace(/\D/g, ""))
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      {postalError && (
                        <p className="mt-1 text-xs text-red-600">
                          {postalError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unit / Floor (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="#12-01"
                        value={unitNumber}
                        onChange={(e) => setUnitNumber(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Street & Building Address *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Auto-fills from postal code (or type manually)"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Loading Bay / Lift Access Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Register at B1 security counter, service lift B"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Order Summary</h3>
                    <div className="flex gap-3 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="cursor-pointer underline hover:text-black"
                      >
                        Edit Step 1 (Menu)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="cursor-pointer underline hover:text-black"
                      >
                        Edit Step 2 (Styling)
                      </button>
                    </div>
                  </div>

                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">
                        {selectedTier.name} ({pax} pax)
                      </dt>
                      <dd className="font-semibold">
                        ${packageSubtotal.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Event Date & Time</dt>
                      <dd className="font-medium">
                        {eventDate} at {eventTime}
                      </dd>
                    </div>
                    {activePresentation && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">
                          Table Presentation: {activePresentation.title} ({pax}{" "}
                          pax)
                        </dt>
                        <dd className="font-medium">
                          {presentationPrice === 0
                            ? "Complimentary"
                            : `$${presentationPrice.toFixed(2)}`}
                        </dd>
                      </div>
                    )}
                    {resolvedSelectedAddOns.map((item) => (
                      <div key={item.optionId} className="flex justify-between">
                        <dt className="text-gray-500">
                          {item.groupTitle} – {item.optionTitle}
                          {item.pickedDetails ? ` (${item.pickedDetails})` : ""}
                          {item.pricingType === "per_pax"
                            ? ` (${pax} pax)`
                            : ""}
                        </dt>
                        <dd className="font-medium">
                          ${item.lineTotal.toFixed(2)}
                        </dd>
                      </div>
                    ))}
                    {legacyActiveAddOns.map((item) => (
                      <div key={item._id} className="flex justify-between">
                        <dt className="text-gray-500">
                          {item.name} × {item.quantity}
                        </dt>
                        <dd className="font-medium">
                          ${item.lineTotal.toFixed(2)}
                        </dd>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
                      <dt>Total Payable</dt>
                      <dd>${grandTotal.toFixed(2)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-2xl bg-gray-50 p-6">
                  {checkoutError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {checkoutError}
                    </div>
                  )}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setStep(1)}
                        className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold hover:border-black disabled:opacity-50"
                      >
                        ← Step 1
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setStep(2)}
                        className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold hover:border-black disabled:opacity-50"
                      >
                        ← Step 2
                      </button>
                    </div>

                    {isLoggedIn ? (
                      <button
                        type="button"
                        disabled={!isStep3AddressValid || loading}
                        onClick={() => handleProceedToPayment(false)}
                        className="cursor-pointer rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {loading
                          ? "Preparing Payment..."
                          : "Proceed to Payment →"}
                      </button>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          disabled={!isStep3AddressValid || loading}
                          onClick={() => handleProceedToPayment(false)}
                          className="cursor-pointer rounded-lg border border-black bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                        >
                          {loading ? "Redirecting..." : "Log In & Pay"}
                        </button>
                        <button
                          type="button"
                          disabled={!isStep3AddressValid || loading}
                          onClick={() => handleProceedToPayment(true)}
                          className="cursor-pointer rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          {loading
                            ? "Creating Checkout..."
                            : "Pay as Guest →"}
                        </button>
                      </div>
                    )}
                  </div>
                  {!isStep3AddressValid && (
                    <p className="mt-3 text-right text-xs text-gray-500">
                      Fill in all required (*) contact and delivery fields above
                      to enable payment.
                    </p>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sticky Cart / Order Summary (4 of 12 cols on desktop) */}
          <aside className="lg:sticky lg:top-6 lg:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  Your Catering Summary
                </h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                  {pax} pax
                </span>
              </div>

              {step === 1 && (
                <div className="mt-4 flex flex-col gap-4">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700">
                      Guests ({rules.minPax}–{rules.maxPax})
                    </label>

                    <input
                      type="number"
                      min={rules.minPax}
                      max={rules.maxPax}
                      step={paxStep}
                      value={pax}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPax(Number.isNaN(val) ? rules.minPax : val);
                      }}
                      onBlur={(e) =>
                        setPax(normalizePax(Number(e.target.value) || rules.minPax))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setPax(normalizePax(pax));
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-semibold"
                    />
                    {!isValidPax && (
                      <p className="mt-1 text-xs text-red-600">
                        Minimum of {rules.minPax} pax required.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-700">
                        Event Date *
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          readOnly
                          placeholder="Select date"
                          value={
                            eventDate
                              ? new Date(`${eventDate}T00:00:00`).toLocaleDateString()
                              : ""
                          }
                          onFocus={() => setIsDatePickerOpen(true)}
                          onClick={() => setIsDatePickerOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setIsDatePickerOpen(false);
                          }}
                          aria-haspopup="dialog"
                          aria-expanded={isDatePickerOpen}
                          aria-controls="event-date-picker"
                          className={`w-full rounded-lg border bg-white px-3 py-2 font-semibold ${
                            isPastDate || activeBlackout
                              ? "border-red-500 text-red-700"
                              : "border-gray-300"
                          } pr-10`}
                        />
                        <button
                          type="button"
                          aria-label="Open calendar"
                          aria-haspopup="dialog"
                          aria-expanded={isDatePickerOpen}
                          aria-controls="event-date-picker"
                          onClick={() => setIsDatePickerOpen(true)}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-800"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-5 w-5"
                          >
                            <rect
                              x="3.5"
                              y="5"
                              width="17"
                              height="16"
                              rx="2"
                            />
                            <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" />
                          </svg>
                        </button>
                        {isDatePickerOpen && (
                          <div
                            id="event-date-picker"
                            role="dialog"
                            aria-label="Choose event date"
                            className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-gray-300 bg-white p-3 shadow-lg"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <button
                                type="button"
                                aria-label="Previous month"
                                disabled={
                                  calendarMonth.getFullYear() ===
                                    Number(minSelectableDate.slice(0, 4)) &&
                                  calendarMonth.getMonth() ===
                                    Number(minSelectableDate.slice(5, 7)) - 1
                                }
                                onClick={() =>
                                  setCalendarMonth(
                                    (month) =>
                                      new Date(
                                        month.getFullYear(),
                                        month.getMonth() - 1,
                                        1
                                      )
                                  )
                                }
                                className="rounded px-2 py-1 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                ‹
                              </button>
                              <span className="text-sm font-semibold text-gray-900">
                                {calendarMonth.toLocaleDateString(undefined, {
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                              <button
                                type="button"
                                aria-label="Next month"
                                onClick={() =>
                                  setCalendarMonth(
                                    (month) =>
                                      new Date(
                                        month.getFullYear(),
                                        month.getMonth() + 1,
                                        1
                                      )
                                  )
                                }
                                className="rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
                              >
                                ›
                              </button>
                            </div>
                            <div className="grid grid-cols-7 text-center text-xs text-gray-500">
                              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
                                (weekday) => (
                                  <span
                                    key={weekday}
                                    className="py-1 font-medium"
                                  >
                                    {weekday}
                                  </span>
                                )
                              )}
                              {calendarDays.map((day, index) => {
                                if (day === 0) {
                                  return <span key={`empty-${index}`} />;
                                }

                                const date = formatLocalDate(
                                  new Date(
                                    calendarMonth.getFullYear(),
                                    calendarMonth.getMonth(),
                                    day
                                  )
                                );
                                const blackout = getBlackoutForDate(date);
                                const disabled =
                                  date < minSelectableDate || Boolean(blackout);

                                return (
                                  <button
                                    key={date}
                                    type="button"
                                    disabled={disabled}
                                    aria-label={`${date}${blackout ? ", unavailable" : ""}`}
                                    aria-pressed={eventDate === date}
                                    title={
                                      blackout?.reason ||
                                      (date < minSelectableDate
                                        ? "Past dates are unavailable"
                                        : undefined)
                                    }
                                    onClick={() => {
                                      setEventDate(date);
                                      setIsDatePickerOpen(false);
                                    }}
                                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                                      eventDate === date
                                        ? "bg-black font-semibold text-white"
                                        : disabled
                                        ? "cursor-not-allowed text-gray-300 line-through"
                                        : "text-gray-800 hover:bg-gray-100"
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {isPastDate && (
                        <p className="mt-1 text-xs text-red-600">
                          Please select today or a future date.
                        </p>
                      )}
                      {!isPastDate && activeBlackout && (
                        <p className="mt-1 text-xs text-red-600">
                          {activeBlackout.reason || "Closed for this category on the selected date."}
                        </p>
                      )}
                    </div>

                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-700">
                        Start Time {/*<br />  ({rules.startTime}–{rules.endTime})*/}
                      </label>
                      <input
                        type="time"
                        min={rules.startTime}
                        max={rules.endTime}
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="mt-1 w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 font-semibold w-full"
                      />
                      {!isValidTime && (
                        <p className="mt-1 text-xs text-red-600">
                          {rules.startTime}–{rules.endTime} only.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-4 text-sm">
                {/* 1. Selected Package Tier */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedTier?.name?.split("–")[0].trim()}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${baseUnitPrice.toFixed(2)} × {pax} guests
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900">
                    ${packageSubtotal.toFixed(2)}
                  </span>
                </div>

                {/* 2. Event Schedule */}
                <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Event Date:</span>
                    <span className="font-medium text-gray-900">
                      {eventDate || "Not selected yet"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Time:</span>
                    <span className="font-medium text-gray-900">
                      {eventTime}
                    </span>
                  </div>
                </div>

                {/* 3. Selected Menu Dishes (Canapés & Beverages) */}
                {(selectedCanapes.length > 0 ||
                  selectedBeverages.length > 0) && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    {selectedCanapes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Canapés ({selectedCanapes.length}/
                          {rules.limitProduct})
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs text-gray-700">
                          {selectedCanapes.map((c) => (
                            <li key={c}>• {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedBeverages.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Beverages ({selectedBeverages.length}/
                          {rules.beverages})
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs text-gray-700">
                          {selectedBeverages.map((b) => (
                            <li key={b}>• {b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Table Presentation */}
                {activePresentation && (
                  <div className="flex items-start justify-between gap-2 border-t border-gray-100 pt-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Presentation
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-gray-800">
                        {activePresentation.title}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">
                      {presentationPrice === 0
                        ? "Free"
                        : `$${presentationPrice.toFixed(2)}`}
                    </span>
                  </div>
                )}

                {/* 5. Optional Add-Ons (Bar, Table, Refreshments) */}
                {(resolvedSelectedAddOns.length > 0 ||
                  legacyActiveAddOns.length > 0) && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Add-Ons
                    </p>
                    {resolvedSelectedAddOns.map((item) => (
                      <div key={item.optionId} className="space-y-0.5">
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <span className="font-medium text-gray-800">
                            {item.optionTitle}
                            {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                            {item.pricingType === "per_pax"
                              ? ` (${pax} pax)`
                              : ""}
                          </span>
                          <span className="font-semibold text-gray-900">
                            ${item.lineTotal.toFixed(2)}
                          </span>
                        </div>
                        {item.pickedDetails && (
                          <p className="border-l-2 border-gray-200 pl-2 text-[11px] text-gray-500">
                            {item.pickedDetails}
                          </p>
                        )}
                      </div>
                    ))}

                    {legacyActiveAddOns.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-start justify-between gap-2 text-xs"
                      >
                        <span className="font-medium text-gray-800">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-semibold text-gray-900">
                          ${item.lineTotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. Grand Total */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-gray-900">
                      Estimated Total
                    </span>
                    <span className="text-xl font-extrabold text-black">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Step {step} of 3 • Updates live as you customize
                  </p>
                </div>

                {/* Quick Step CTA inside Sidebar */}
                {step === 1 && (
                  <button
                    type="button"
                    disabled={!isStep1Complete}
                    onClick={() => setStep(2)}
                    className="mt-2 w-full cursor-pointer rounded-lg bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {isStep1Complete
                      ? "Next: Presentation & Add-Ons →"
                      : !eventDate
                      ? "Select Event Date"
                      : isPastDate || activeBlackout
                      ? "Selected Date Unavailable"
                      : `Pick ${rules.limitProduct - selectedCanapes.length} canapé(s) & ${
                          rules.beverages - selectedBeverages.length
                        } drink(s)`}
                  </button>
                )}

                {step === 2 && (
                  <button
                    type="button"
                    disabled={!isStep2Complete}
                    onClick={() => setStep(3)}
                    className="w-full cursor-pointer rounded-lg bg-black py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Continue to Address &amp; Payment →
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* =========================================================
            STEP 4: CONFIRMATION (LOCKED — NO BACKWARD NAVIGATION)
        ========================================================= */
        <div className="mx-auto max-w-2xl">
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Catering Booking Confirmed
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
              Thank you! Your catering order has been received and a
              confirmation email with your event schedule has been sent.
            </p>

            {confirmedCheckoutId && (
              <div className="mt-4 inline-block rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">
                Booking Reference:{" "}
                <span className="font-mono font-semibold text-black">
                  {confirmedCheckoutId}
                </span>
              </div>
            )}

            {loyaltyAward?.awarded && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-base font-semibold text-amber-900">
                  +{loyaltyAward.pointsEarned} Loyalty Points Earned!
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  New Balance: <strong>{loyaltyAward.newBalance} pts</strong> (
                  {loyaltyAward.tier} Tier)
                </p>
              </div>
            )}

            <div className="mt-8 flex justify-center gap-3">
              <a
                href="/account"
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-black"
              >
                View My Loyalty Points
              </a>
              <a
                href="/catering"
                className="rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Back to Catering Menus
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}