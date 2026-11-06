"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./Header";
import MenuDrawer from "./MenuDrawer";
import SearchPanel from "./SearchPanel";
import ContactPanel from "./ContactPanel";

type PanelName = "menu" | "search" | "contact";
const CLOSE_MS: Record<PanelName, number> = { menu: 340, search: 300, contact: 340 };

/** Header plus the three overlay panels. Only one panel is open at a time. */
export default function SiteChrome() {
  const [open, setOpen] = useState<PanelName | null>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const show = useCallback((name: PanelName) => {
    clear();
    setClosing(false);
    setOpen(name);
  }, []);

  const hide = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      setOpen(null);
      setClosing(false);
    }, CLOSE_MS[open]);
  }, [open, closing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hide]);

  useEffect(() => clear, []);

  return (
    <>
      <Header
        menuOpen={open === "menu"}
        searchOpen={open === "search"}
        contactOpen={open === "contact"}
        onMenu={() => (open === "menu" ? hide() : show("menu"))}
        onSearch={() => show("search")}
        onContact={() => show("contact")}
      />
      {open === "menu" && <MenuDrawer closing={closing} onClose={hide} />}
      {open === "search" && <SearchPanel closing={closing} onClose={hide} />}
      {open === "contact" && <ContactPanel closing={closing} onClose={hide} />}
    </>
  );
}
