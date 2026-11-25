"use client";

import React, { useState, useMemo } from "react";
import { AddOnGroupItem, AddOnOptionItem } from "@/lib/wix-addon";

export interface SelectedAddOn {
  optionId: string;
  quantity: number;
  pickedItems?: Record<string, string[]>; // e.g., { cocktails: ["Classic Mojito", ...], mocktails: [...] }
  barPax?: number;       // Free flow bar guest count (min 20)
  barHours?: number;     // Free flow bar duration in hours (min 2)
  barStartTime?: string; // HH:mm within [eventTime - 3h, eventTime]
}

interface Step2AddOnsProps {
  addOnGroups: AddOnGroupItem[];
  selectedTierCollectionIds: string[];
  currentCategorySlug?: string;
  pax: number;
  paxInterval: number; // e.g., 5 for increments of 5 pax
  eventTime?: string; // e.g. "12:00" from Step 1
  selectedAddOns: SelectedAddOn[];
  onChangeSelectedAddOns: React.Dispatch<React.SetStateAction<SelectedAddOn[]>>;
  drinkMenus?: Record<string, string[]>;
}

const DEFAULT_DRINK_MENUS: Record<string, string[]> = {
  cocktails: [
    "Classic Mojito",
    "Lychee Martini",
    "Yuzu Gin Fizz",
    "Aperol Spritz",
    "Negroni",
    "Whisky Sour",
  ],
  mocktails: [
    "Virgin Mojito",
    "Yuzu Sparkler",
    "Passionfruit Cooler",
    "Shirley Temple",
    "Hibiscus Iced Tea",
  ],
};

// Columns displayed in the Free Flow Bar comparison table
const MATRIX_COLUMNS = [
  { key: "soft drinks", label: "Soft Drink" },
  { key: "juices", label: "Juices" },
  { key: "beer", label: "Beer" },
  { key: "wine", label: "Wine" },
  { key: "cocktails", label: "Cocktails", isPicker: true },
  { key: "mocktails", label: "Mocktails", isPicker: true },
];

// Parse "HH:mm" into total minutes since 00:00
function timeToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || "12:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 12) * 60 + (Number.isFinite(m) ? m : 0);
}

// Format total minutes back into "HH:mm" (clamped to 00:00..23:59)
function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Generate 30-min time slots from (eventTime - 3 hrs) up to eventTime inclusive
function getAllowedBarStartTimes(eventTime: string): string[] {
  const endMins = timeToMinutes(eventTime || "12:00");
  const startMins = Math.max(0, endMins - 180);
  const slots: string[] = [];

  for (let m = startMins; m <= endMins; m += 30) {
    slots.push(minutesToTime(m));
  }
  if (slots.length === 0 || slots[slots.length - 1] !== minutesToTime(endMins)) {
    slots.push(minutesToTime(endMins));
  }
  return slots;
}

export default function Step2AddOns({
  addOnGroups,
  selectedTierCollectionIds,
  currentCategorySlug,
  pax,
  paxInterval = 5,
  eventTime = "12:00",
  selectedAddOns,
  onChangeSelectedAddOns,
  drinkMenus = DEFAULT_DRINK_MENUS,
}: Step2AddOnsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const allowedStartTimes = useMemo(
    () => getAllowedBarStartTimes(eventTime),
    [eventTime]
  );

  const toggleSectionAccordion = (sectionName: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const toggleGroupAccordion = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // 1. Filter groups by category (empty = ALL categories)
  const visibleGroups = useMemo(() => {
    return addOnGroups.filter((group) => {
      if (group.options.length === 0) return false;
      if (group.applicableCategoryIds.length === 0) return true;

      return group.applicableCategoryIds.some(
        (catId) =>
          selectedTierCollectionIds.includes(catId) ||
          (currentCategorySlug &&
            catId.toLowerCase() === currentCategorySlug.toLowerCase())
      );
    });
  }, [addOnGroups, selectedTierCollectionIds, currentCategorySlug]);

  // 2. Group Level 2 groups under Level 1 sectionName
  const sections = useMemo(() => {
    const map = new Map<string, AddOnGroupItem[]>();
    for (const group of visibleGroups) {
      const list = map.get(group.sectionName) || [];
      list.push(group);
      map.set(group.sectionName, list);
    }
    return Array.from(map.entries());
  }, [visibleGroups]);

  // Quantity setter for Basic Product Cards (- [ input ] +)
  const setOptionQuantity = (optionId: string, rawQty: number) => {
    const nextQty = Math.max(0, Math.floor(Number.isNaN(rawQty) ? 0 : rawQty));
    onChangeSelectedAddOns((prev) => {
      const without = prev.filter((s) => s.optionId !== optionId);
      if (nextQty === 0) return without;
      return [...without, { optionId, quantity: nextQty }];
    });
  };

  // Card click handler for Basic Product Cards (toggles 0 <-> 1)
  const handleBasicCardClick = (optionId: string, currentQty: number) => {
    if (currentQty > 0) {
      setOptionQuantity(optionId, 0);
    } else {
      setOptionQuantity(optionId, 1);
    }
  };

  // Single-select row click handler for Free Flow Bar matrix
  const selectSingleMatrixOption = (
    group: AddOnGroupItem,
    option: AddOnOptionItem
  ) => {
    const optionStep = Math.max(1, option.paxInterval ?? paxInterval);

    onChangeSelectedAddOns((prev) => {
      const isAlreadySelected = prev.some((s) => s.optionId === option._id);
      const siblingIds = new Set(group.options.map((o) => o._id));
      const withoutSiblings = prev.filter((s) => !siblingIds.has(s.optionId));

      if (isAlreadySelected) {
        return withoutSiblings;
      }
      return [
        ...withoutSiblings,
        {
          optionId: option._id,
          quantity: 1,
          pickedItems: {},
          barPax: normalizeBarPax(Math.max(20, pax), optionStep),
          barHours: 2,
          barStartTime: eventTime || "12:00",
        },
      ];
    });
  };

  // Update Free Flow Bar configuration (guests >= 20, hours >= 2, startTime)
  const updateFreeFlowConfig = (
    optionId: string,
    patch: Partial<Pick<SelectedAddOn, "barPax" | "barHours" | "barStartTime">>
  ) => {
    onChangeSelectedAddOns((prev) =>
      prev.map((item) => {
        if (item.optionId !== optionId) return item;
        return {
          ...item,
          ...patch,
        };
      })
    );
  };

  // Drink picker pill toggle (e.g., 3 cocktails, 3 mocktails)
  const togglePickedDrink = (
    optionId: string,
    pickerKey: string,
    drinkName: string,
    maxCount: number
  ) => {
    onChangeSelectedAddOns((prev) =>
      prev.map((item) => {
        if (item.optionId !== optionId) return item;
        const currentList = item.pickedItems?.[pickerKey] || [];
        const exists = currentList.includes(drinkName);

        let updatedList: string[];
        if (exists) {
          updatedList = currentList.filter((d) => d !== drinkName);
        } else {
          if (currentList.length >= maxCount) return item;
          updatedList = [...currentList, drinkName];
        }

        return {
          ...item,
          pickedItems: {
            ...(item.pickedItems || {}),
            [pickerKey]: updatedList,
          },
        };
      })
    );
  };

  // Helper to resolve matrix cell value (✓, –, or count like 3)
  const renderMatrixCell = (
    option: AddOnOptionItem,
    colKey: string,
    isPicker?: boolean
  ) => {
    if (isPicker && option.customPickers) {
      const matchedKey = Object.keys(option.customPickers).find(
        (k) => k.toLowerCase() === colKey.toLowerCase()
      );
      const count = matchedKey ? option.customPickers[matchedKey] : 0;
      if (count > 0) {
        return <span className="font-bold text-neutral-900">{count}</span>;
      }
    }

    const hasInclusion = option.inclusions.some(
      (inc) =>
        inc.toLowerCase().includes(colKey) || colKey.includes(inc.toLowerCase())
    );
    if (hasInclusion) {
      return <span className="font-bold text-emerald-600">✓</span>;
    }

    return <span className="text-neutral-400">–</span>;
  };

  if (sections.length === 0) return null;

    const normalizeBarPax = (raw: number, step: number) => {
        const min = 20;
        const clamped = Math.max(min, Number.isFinite(raw) ? raw : min);
        return min + Math.round((clamped - min) / step) * step;
    };

  return (
    <div className="space-y-4">
      {sections.map(([sectionName, groups]) => {
        const isSectionOpen = Boolean(openSections[sectionName]);
        const sectionOptionIds = new Set(
          groups.flatMap((g) => g.options.map((o) => o._id))
        );
        const sectionSelectedCount = selectedAddOns.filter((s) =>
          sectionOptionIds.has(s.optionId)
        ).length;

        return (
          <div
            key={sectionName}
            className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
          >
            {/* LEVEL 1 ACCORDION HEADER */}
            <button
              type="button"
              onClick={() => toggleSectionAccordion(sectionName)}
              className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition hover:bg-neutral-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-neutral-900">
                  {sectionName}
                </span>
                {sectionSelectedCount > 0 && (
                  <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-medium text-white">
                    {sectionSelectedCount} selected
                  </span>
                )}
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-300 text-lg font-bold text-neutral-700">
                {isSectionOpen ? "−" : "+"}
              </span>
            </button>

            {/* LEVEL 1 BODY */}
            {isSectionOpen && (
              <div className="space-y-3 border-t border-neutral-100 bg-neutral-50/50 p-4 sm:p-6">
                {groups.map((group) => {
                  const isGroupOpen = Boolean(openGroups[group._id]);
                  const groupOptionIds = new Set(
                    group.options.map((o) => o._id)
                  );
                  const groupSelectedCount = selectedAddOns.filter((s) =>
                    groupOptionIds.has(s.optionId)
                  ).length;

                  const isComparisonTable =
                    group.selectionMode === "single" &&
                    (group.title.toLowerCase().includes("free flow") ||
                      group.options.some(
                        (o) => o.customPickers || o.inclusions.length > 0
                      ));

                  return (
                    <div
                      key={group._id}
                      className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
                    >
                      {/* LEVEL 2 ACCORDION HEADER */}
                      <button
                        type="button"
                        onClick={() => toggleGroupAccordion(group._id)}
                        className="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left transition hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-neutral-800">
                            {group.title}
                          </span>
                          {groupSelectedCount > 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              {groupSelectedCount} active
                            </span>
                          )}
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded border border-neutral-300 text-base font-bold text-neutral-700">
                          {isGroupOpen ? "−" : "+"}
                        </span>
                      </button>

                      {/* LEVEL 3 CONTENT */}
                      {isGroupOpen && (
                        <div className="border-t border-neutral-100 p-4 sm:p-5">
                          {isComparisonTable ? (
                            /* LAYOUT B: FREE FLOW BAR COMPARISON TABLE */
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                                <thead>
                                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-600">
                                    <th className="py-3 pl-3 pr-4">Package</th>
                                    {MATRIX_COLUMNS.map((col) => (
                                      <th
                                        key={col.key}
                                        className="px-2 py-3 text-center"
                                      >
                                        {col.label}
                                      </th>
                                    ))}
                                    <th className="py-3 pl-3 pr-3 text-right">
                                      Per Guest / Hr
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200">
                                  {group.options.map((option) => {
                                    const selectedEntry = selectedAddOns.find(
                                      (s) => s.optionId === option._id
                                    );
                                    const isSelected = Boolean(selectedEntry);
                                    const barPax =
                                      selectedEntry?.barPax ?? Math.max(20, pax);
                                    const barPaxInterval = Math.max(
                                      1,
                                      option.paxInterval ?? paxInterval
                                    );
                                    const barHours =
                                      selectedEntry?.barHours ?? 2;
                                    const barStartTime =
                                      selectedEntry?.barStartTime &&
                                      allowedStartTimes.includes(
                                        selectedEntry.barStartTime
                                      )
                                        ? selectedEntry.barStartTime
                                        : allowedStartTimes[
                                            allowedStartTimes.length - 1
                                          ];
                                    const optionTotal =
                                      option.price * barPax * barHours;

                                    return (
                                      <React.Fragment key={option._id}>
                                        <tr
                                          onClick={() =>
                                            selectSingleMatrixOption(
                                              group,
                                              option
                                            )
                                          }
                                          className={`cursor-pointer transition ${
                                            isSelected
                                              ? "bg-neutral-900/5 font-medium"
                                              : "hover:bg-neutral-50"
                                          }`}
                                        >
                                          <td className="py-3.5 pl-3 pr-4">
                                            <div className="flex items-center gap-2.5">
                                              <input
                                                type="radio"
                                                name={`group-${group._id}`}
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="h-4 w-4 accent-neutral-900"
                                              />
                                              <span className="font-semibold text-neutral-900">
                                                {option.title}
                                              </span>
                                            </div>
                                          </td>

                                          {MATRIX_COLUMNS.map((col) => (
                                            <td
                                              key={col.key}
                                              className="px-2 py-3.5 text-center"
                                            >
                                              {renderMatrixCell(
                                                option,
                                                col.key,
                                                col.isPicker
                                              )}
                                            </td>
                                          ))}

                                          <td className="py-3.5 pl-3 pr-3 text-right font-bold text-neutral-900">
                                            ${option.price.toFixed(2)}
                                          </td>
                                        </tr>

                                        {/* Expanded Row Drawer */}
                                        {isSelected && (
                                          <tr className="bg-neutral-50">
                                            <td
                                              colSpan={
                                                MATRIX_COLUMNS.length + 2
                                              }
                                              className="border-t border-neutral-200 px-4 py-4"
                                            >
                                              <div className="space-y-4">
                                                {/* Free Flow Bar Guests, Hours & Start Time Controls */}
                                                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                                                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                                                      Configure Free Flow Bar
                                                      Schedule &amp; Headcount
                                                    </p>
                                                    <span className="text-xs font-semibold text-emerald-700">
                                                      Subtotal: $
                                                      {optionTotal.toFixed(2)} (
                                                      {barPax} pax × {barHours}{" "}
                                                      hrs)
                                                    </span>
                                                  </div>

                                                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                    {/* 1. Guests (min 20) */}
                                                    <div>
                                                      <label className="block text-xs font-medium text-neutral-700">
                                                        Bar Guests (min 20 pax)
                                                      </label>
                                                      <div className="mt-1 inline-flex items-center overflow-hidden rounded-lg border border-neutral-300 bg-white">
                                                        <button
                                                          type="button"
                                                          disabled={
                                                            barPax <= 20
                                                          }
                                                          onClick={() =>
                                                            updateFreeFlowConfig(
                                                              option._id,
                                                              {
                                                                barPax:
                                                                  Math.max(
                                                                    20,
                                                                    barPax -
                                                                      barPaxInterval
                                                                  ),
                                                              }
                                                            )
                                                          }
                                                          className="h-9 w-9 cursor-pointer font-bold text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                          −
                                                        </button>
                                                        <input
                                                          type="number"
                                                          min={20}
                                                          step={barPaxInterval}
                                                          value={barPax}
                                                          onChange={(e) => {
                                                            const val = Number(
                                                              e.target.value
                                                            );
                                                            updateFreeFlowConfig(
                                                              option._id,
                                                              {
                                                                barPax:
                                                                  Number.isFinite(
                                                                    val
                                                                  )
                                                                    ? Math.max(
                                                                        20,
                                                                        Math.floor(
                                                                          val
                                                                        )
                                                                      )
                                                                    : 20,
                                                              }
                                                            );
                                                          }}
                                                          onBlur={() =>
                                                            updateFreeFlowConfig(
                                                              option._id,
                                                              {
                                                                barPax:
                                                                  normalizeBarPax(
                                                                    barPax,
                                                                    barPaxInterval
                                                                  ),
                                                              }
                                                            )
                                                          }
                                                          className="h-9 w-16 border-x border-neutral-300 text-center text-sm font-semibold text-neutral-900 focus:outline-none"
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            updateFreeFlowConfig(
                                                              option._id,
                                                              {
                                                                barPax:
                                                                  barPax +
                                                                  barPaxInterval,
                                                              }
                                                            )
                                                          }
                                                          className="h-9 w-9 cursor-pointer font-bold text-neutral-700 hover:bg-neutral-100"
                                                        >
                                                          +
                                                        </button>
                                                      </div>
                                                    </div>

                                                    {/* 2. Duration in Hours (min 2) */}
                                                    <div>
                                                      <label className="block text-xs font-medium text-neutral-700">
                                                        Duration (min 2 hours)
                                                      </label>
                                                      <div className="mt-1 inline-flex items-center overflow-hidden rounded-lg border border-neutral-300 bg-white">
                                                        <button
                                                          type="button"
                                                          disabled={
                                                            barHours <= 2
                                                          }
                                                          onClick={() =>
                                                            updateFreeFlowConfig(
                                                              option._id,
                                                              {
                                                                barHours:
                                                                  Math.max(
                                                                    2,
                                                                    barHours - 1
                                                                  ),
                                                              }
                                                            )
                                                          }
                                                          className="h-9 w-9 cursor-pointer font-bold text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                          −
                                                        </button>
                                                        <input
                                                          type="number"
                                                          min={2}
                                                          max={12}
                                                          value={barHours}
                                                          onChange={(e) => {
                                                            const val = Number(
                                                              e.target.value
                                                            );
                                                            updateFreeFlowConfig(
                                                              option._id,
                                                              {
                                                                barHours:
                                                                  Number.isFinite(
                                                                    val
                                                                  )
                                                                    ? Math.max(
                                                                        2,
                                                                        Math.floor(
                                                                          val
                                                                        )
                                                                      )
                                                                    : 2,
                                                              }
                                                            );
                                                          }}
                                                          className="h-9 w-16 border-x border-neutral-300 text-center text-sm font-semibold text-neutral-900 focus:outline-none"
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            updateFreeFlowConfig(
                                                              option._id,
                                                              {
                                                                barHours:
                                                                  barHours + 1,
                                                              }
                                                            )
                                                          }
                                                          className="h-9 w-9 cursor-pointer font-bold text-neutral-700 hover:bg-neutral-100"
                                                        >
                                                          +
                                                        </button>
                                                      </div>
                                                    </div>

                                                    {/* 3. Bar Start Time (eventTime - 3h to eventTime) */}
                                                    <div>
                                                      <label className="block text-xs font-medium text-neutral-700">
                                                        Bar Start Time (earliest{" "}
                                                        {allowedStartTimes[0]},
                                                        latest{" "}
                                                        {
                                                          allowedStartTimes[
                                                            allowedStartTimes.length -
                                                              1
                                                          ]
                                                        }
                                                        )
                                                      </label>
                                                      <select
                                                        value={barStartTime}
                                                        onChange={(e) =>
                                                          updateFreeFlowConfig(
                                                            option._id,
                                                            {
                                                              barStartTime:
                                                                e.target.value,
                                                            }
                                                          )
                                                        }
                                                        className="mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-900 focus:outline-none"
                                                      >
                                                        {allowedStartTimes.map(
                                                          (slot) => (
                                                            <option
                                                              key={slot}
                                                              value={slot}
                                                            >
                                                              {slot}
                                                              {slot ===
                                                              eventTime
                                                                ? " (Event Start)"
                                                                : ""}
                                                            </option>
                                                          )
                                                        )}
                                                      </select>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Inclusions */}
                                                <div>
                                                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                                                    What&apos;s Included &amp;
                                                    Pouring ({option.title})
                                                  </p>
                                                  {option.description && (
                                                    <p className="mt-1 text-sm text-neutral-600">
                                                      {option.description}
                                                    </p>
                                                  )}
                                                  {option.inclusions.length >
                                                    0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                      {option.inclusions.map(
                                                        (inc) => (
                                                          <span
                                                            key={inc}
                                                            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800"
                                                          >
                                                            <span className="font-bold text-emerald-600">
                                                              ✓
                                                            </span>
                                                            {inc}
                                                          </span>
                                                        )
                                                      )}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Custom Drink Pickers */}
                                                {option.customPickers &&
                                                  Object.entries(
                                                    option.customPickers
                                                  ).map(
                                                    ([
                                                      pickerKey,
                                                      maxCount,
                                                    ]) => {
                                                      const picked =
                                                        selectedEntry
                                                          ?.pickedItems?.[
                                                          pickerKey
                                                        ] || [];
                                                      const menuKey =
                                                        Object.keys(
                                                          drinkMenus
                                                        ).find(
                                                          (k) =>
                                                            k.toLowerCase() ===
                                                            pickerKey.toLowerCase()
                                                        );
                                                      const choices = menuKey
                                                        ? drinkMenus[menuKey]
                                                        : [];

                                                      return (
                                                        <div
                                                          key={pickerKey}
                                                          className="rounded-lg border border-neutral-200 bg-white p-3.5"
                                                        >
                                                          <p className="mb-2 text-xs font-semibold capitalize text-neutral-800">
                                                            Select {maxCount}{" "}
                                                            {pickerKey} (
                                                            {picked.length}/
                                                            {maxCount} chosen)
                                                          </p>
                                                          <div className="flex flex-wrap gap-2">
                                                            {choices.map(
                                                              (drink) => {
                                                                const active =
                                                                  picked.includes(
                                                                    drink
                                                                  );
                                                                const disabled =
                                                                  !active &&
                                                                  picked.length >=
                                                                    maxCount;
                                                                return (
                                                                  <button
                                                                    key={drink}
                                                                    type="button"
                                                                    disabled={
                                                                      disabled
                                                                    }
                                                                    onClick={() =>
                                                                      togglePickedDrink(
                                                                        option._id,
                                                                        pickerKey,
                                                                        drink,
                                                                        maxCount
                                                                      )
                                                                    }
                                                                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition ${
                                                                      active
                                                                        ? "bg-neutral-900 text-white"
                                                                        : disabled
                                                                        ? "cursor-not-allowed border border-neutral-200 text-neutral-300"
                                                                        : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900"
                                                                    }`}
                                                                  >
                                                                    {active
                                                                      ? `✓ ${drink}`
                                                                      : drink}
                                                                  </button>
                                                                );
                                                              }
                                                            )}
                                                          </div>
                                                        </div>
                                                      );
                                                    }
                                                  )}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            /* LAYOUT A: BASIC PRODUCT CARDS */
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                              {group.options.map((option) => {
                                const selectedEntry = selectedAddOns.find(
                                  (s) => s.optionId === option._id
                                );
                                const qty = selectedEntry?.quantity || 0;
                                const isSelected = qty > 0;

                                const unitForm =
                                  (option as any).unitLabel ||
                                  (option.pricingType === "per_pax"
                                    ? "per guest"
                                    : option.pricingType === "per_unit"
                                    ? "per pack"
                                    : "per set");

                                return (
                                  <div
                                    key={option._id}
                                    onClick={() =>
                                      handleBasicCardClick(option._id, qty)
                                    }
                                    className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                                      isSelected
                                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                                        : "border-neutral-200 bg-white hover:border-neutral-400"
                                    }`}
                                  >
                                    <div>
                                      {option.imageUrl && (
                                        <img
                                          src={option.imageUrl}
                                          alt={option.title}
                                          className="mb-3 h-36 w-full rounded-lg border border-neutral-100 bg-white object-contain p-2"
                                        />
                                      )}

                                      <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-neutral-900">
                                          {option.title}
                                        </p>
                                        {isSelected && (
                                          <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                                            ✓
                                          </span>
                                        )}
                                      </div>

                                      {option.description && (
                                        <p className="mt-1 text-xs text-neutral-500">
                                          {option.description}
                                        </p>
                                      )}

                                      <p className="mt-2 text-sm font-bold text-neutral-900">
                                        ${option.price.toFixed(2)}{" "}
                                        <span className="text-xs font-normal text-neutral-500">
                                          {unitForm}
                                        </span>
                                      </p>
                                    </div>

                                    {isSelected && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-200 pt-3"
                                      >
                                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-neutral-300 bg-white">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setOptionQuantity(
                                                option._id,
                                                qty - 1
                                              )
                                            }
                                            aria-label={`Decrease ${option.title}`}
                                            className="h-8 w-8 cursor-pointer font-bold text-neutral-700 hover:bg-neutral-100"
                                          >
                                            −
                                          </button>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            aria-label={`${option.title} quantity`}
                                            value={qty}
                                            onChange={(e) => {
                                              const digitsOnly =
                                                e.target.value.replace(
                                                  /\D/g,
                                                  ""
                                                );
                                              setOptionQuantity(
                                                option._id,
                                                digitsOnly === ""
                                                  ? 0
                                                  : Number(digitsOnly)
                                              );
                                            }}
                                            className="h-8 w-12 border-x border-neutral-300 text-center text-sm font-semibold text-neutral-900 focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setOptionQuantity(
                                                option._id,
                                                qty + 1
                                              )
                                            }
                                            aria-label={`Increase ${option.title}`}
                                            className="h-8 w-8 cursor-pointer font-bold text-neutral-700 hover:bg-neutral-100"
                                          >
                                            +
                                          </button>
                                        </div>

                                        <span className="text-xs font-medium text-neutral-600">
                                          {unitForm}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
        );
      })}
    </div>
  );
}