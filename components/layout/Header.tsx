"use client";

import Link from "next/link";
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/Icons";
import { useBag } from "@/components/providers/BagProvider";

interface HeaderProps {
  menuOpen: boolean;
  searchOpen: boolean;
  contactOpen: boolean;
  onMenu: () => void;
  onSearch: () => void;
  onContact: () => void;
}

const textBtn =
  "link-grow flex items-center gap-2.5 border-0 bg-transparent py-2.5 text-[13px] tracking-[0.01em] text-inherit cursor-pointer";
const iconBtn =
  "relative flex items-center gap-2.5 border-0 bg-transparent py-2.5 text-[13px] tracking-[0.01em] text-inherit cursor-pointer";

export default function Header({ menuOpen, searchOpen, contactOpen, onMenu, onSearch, onContact }: HeaderProps) {
  const { count } = useBag();

  return (
    <header className="group absolute inset-x-0 top-0 z-30 border-b border-transparent text-ink transition-colors duration-[350ms] hover:border-line hover:bg-white focus-within:border-line focus-within:bg-white">
      <div className="mx-auto grid h-[72px] max-w-site grid-cols-[1fr_auto_1fr] items-center gap-3 px-gutter">
        <div className="flex items-center gap-8">
          <button type="button" onClick={onMenu} aria-expanded={menuOpen} aria-controls="drawer" className={textBtn}>
            <MenuIcon />
            Menu
          </button>
          <button type="button" onClick={onSearch} aria-expanded={searchOpen} aria-controls="search-panel" className={textBtn}>
            <SearchIcon />
            Search
          </button>
        </div>

        <Link
          href="/"
          aria-label="The Plattering Co. home"
          className="whitespace-nowrap pl-[0.16em] text-brand font-normal tracking-[0.16em] text-ink-soft transition-colors duration-[350ms] group-hover:text-ink"
        >
          THE PLATTERING CO.
        </Link>

        <div className="flex items-center justify-end gap-6">
          <button type="button" onClick={onContact} aria-expanded={contactOpen} aria-controls="contact-panel" className={textBtn}>
            Contact Us
          </button>
          <button type="button" aria-label="Saved" className={iconBtn}>
            <HeartIcon />
          </button>
          <button type="button" aria-label="Account" className={iconBtn}>
            <UserIcon />
          </button>
          <button type="button" aria-label={`Bag, ${count} items`} className={iconBtn}>
            <BagIcon />
            <span
              aria-hidden="true"
              className="absolute right-[-6px] top-1 flex h-[13px] min-w-[13px] items-center justify-center rounded-[7px] bg-ink text-[8px] text-white"
            >
              {count}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
