// Feature: urbanfit-ui-fixes (bugfix)
// POV (point of view) context — Candidate/HR viewing mode for the shell.
//
// Introduces a small piece of global UI state: which "point of view" the app
// is currently rendered from. This is exposed via a React context/provider
// mounted once by AppShell, and toggled by <PovToggle/> (Req 2.2).
//
// The state model is intentionally minimal: a two-value union plus a setter,
// defaulting to "candidate".

import { createContext, createElement, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

/** The two supported points of view. */
export type Pov = "candidate" | "hr";

export interface PovContextValue {
  pov: Pov;
  setPov: Dispatch<SetStateAction<Pov>>;
}

const PovContext = createContext<PovContextValue | null>(null);

export interface PovProviderProps {
  children: ReactNode;
  /** Optional initial value, defaults to "candidate". Mainly for tests. */
  initialPov?: Pov;
}

/** Provides the current POV + setter to the subtree (mounted by AppShell). */
export function PovProvider({ children, initialPov = "candidate" }: PovProviderProps) {
  const [pov, setPov] = useState<Pov>(initialPov);
  return createElement(PovContext.Provider, { value: { pov, setPov } }, children);
}

/** Reads the current POV state. Must be used within a <PovProvider>. */
export function usePov(): PovContextValue {
  const ctx = useContext(PovContext);
  if (!ctx) {
    throw new Error("usePov must be used within a PovProvider");
  }
  return ctx;
}
