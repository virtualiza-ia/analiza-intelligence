"use client";

import { useEffect, useMemo, useState } from "react";

const storageKey = "analiza:selected-context";
const demoBusinessLineStorageKey = "analiza:demo-business-line";
const contextChangeEvent = "analiza:context-change";

export type ActiveBusinessLine = "Consolidado" | "Fisioterapia" | "Laboratorio" | "Imagenes";

type StoredBusinessLineContext = {
  businessLineCode?: string;
  businessLineId?: string;
  businessLineName?: string;
  companyName?: string;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStoredBusinessLineContext(
  value: unknown,
): value is StoredBusinessLineContext {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    (record.businessLineCode === undefined ||
      isString(record.businessLineCode)) &&
    (record.businessLineId === undefined || isString(record.businessLineId)) &&
    (record.businessLineName === undefined ||
      isString(record.businessLineName)) &&
    (record.companyName === undefined || isString(record.companyName))
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function readStoredContext(storage: Storage) {
  const rawValue = storage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return isStoredBusinessLineContext(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function resolveActiveBusinessLine(
  context: StoredBusinessLineContext & { lineParam?: string | null },
): ActiveBusinessLine {
  const lineText = normalizeText(
    [
      context.lineParam,
      context.businessLineId,
      context.businessLineCode,
      context.businessLineName,
      context.companyName,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (lineText.includes("laboratorio") || lineText.includes("laboratory")) {
    return "Laboratorio";
  }

  if (
    lineText.includes("fisioterapia") ||
    lineText.includes("physiotherapy")
  ) {
    return "Fisioterapia";
  }

  if (
    lineText.includes("imagenes") ||
    lineText.includes("imagen") ||
    lineText.includes("imaging")
  ) {
    return "Imagenes";
  }

  return "Consolidado";
}

function getActiveBusinessLineFromBrowser(): ActiveBusinessLine {
  const searchParams = new URLSearchParams(window.location.search);
  const storedContext =
    readStoredContext(window.localStorage) ??
    readStoredContext(window.sessionStorage) ??
    {};
  const demoBusinessLineCode =
    window.localStorage.getItem(demoBusinessLineStorageKey) ??
    window.sessionStorage.getItem(demoBusinessLineStorageKey);
  const storedBusinessLineCode =
    storedContext.businessLineCode === "CONSOLIDATED"
      ? undefined
      : storedContext.businessLineCode;

  return resolveActiveBusinessLine({
    ...storedContext,
    businessLineCode: storedBusinessLineCode ?? demoBusinessLineCode ?? undefined,
    lineParam: searchParams.get("line"),
  });
}

export function useActiveBusinessLine() {
  const [activeBusinessLine, setActiveBusinessLine] =
    useState<ActiveBusinessLine>("Consolidado");

  useEffect(() => {
    const syncBusinessLine = () =>
      setActiveBusinessLine(getActiveBusinessLineFromBrowser());

    syncBusinessLine();
    window.addEventListener(contextChangeEvent, syncBusinessLine);
    window.addEventListener("popstate", syncBusinessLine);
    window.addEventListener("storage", syncBusinessLine);

    return () => {
      window.removeEventListener(contextChangeEvent, syncBusinessLine);
      window.removeEventListener("popstate", syncBusinessLine);
      window.removeEventListener("storage", syncBusinessLine);
    };
  }, []);

  return useMemo(
    () => ({
      isConsolidated: activeBusinessLine === "Consolidado",
      line: activeBusinessLine,
    }),
    [activeBusinessLine],
  );
}
