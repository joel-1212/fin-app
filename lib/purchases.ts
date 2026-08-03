"use client";

import { Capacitor } from "@capacitor/core";
import type {
  CustomerInfo,
  MakePurchaseResult,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesPlugin,
} from "@revenuecat/purchases-capacitor";

/**
 * Must match the entitlement identifier configured in the RevenueCat dashboard.
 * The owner should keep this value in sync when creating the Pro entitlement.
 */
export const REVENUECAT_ENTITLEMENT_ID = "pro";

export type PurchasesUnavailableReason = "browser" | "missing-api-key";

export type NativePurchasesResult<T> =
  | { available: true; value: T }
  | { available: false; reason: PurchasesUnavailableReason };

export type PurchasesInitialization =
  | { available: true }
  | { available: false; reason: PurchasesUnavailableReason };

type ReadyPurchases = { available: true; purchases: PurchasesPlugin };
type PurchasesRuntime = ReadyPurchases | { available: false; reason: PurchasesUnavailableReason };

const publicApiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY?.trim();
let initializationPromise: Promise<PurchasesRuntime> | null = null;
let purchasesModulePromise: Promise<typeof import("@revenuecat/purchases-capacitor")> | null = null;

function isNativeCapacitorContext() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

async function loadPurchasesModule() {
  purchasesModulePromise ??= import("@revenuecat/purchases-capacitor");
  return purchasesModulePromise;
}

async function getReadyPurchases(): Promise<PurchasesRuntime> {
  if (!isNativeCapacitorContext()) return { available: false, reason: "browser" };
  if (!publicApiKey) return { available: false, reason: "missing-api-key" };

  if (!initializationPromise) {
    const pendingInitialization = (async (): Promise<ReadyPurchases> => {
      const { Purchases } = await loadPurchasesModule();
      const { isConfigured } = await Purchases.isConfigured();
      if (!isConfigured) await Purchases.configure({ apiKey: publicApiKey });
      return { available: true, purchases: Purchases };
    })();

    initializationPromise = pendingInitialization.catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

/** Configure RevenueCat once when the app is running inside a native Capacitor shell. */
export async function initializePurchases(): Promise<PurchasesInitialization> {
  const runtime = await getReadyPurchases();
  return runtime.available ? runtime : { available: false, reason: runtime.reason };
}

/** Fetch the current RevenueCat offering and its available packages. */
export async function getOfferings(): Promise<NativePurchasesResult<PurchasesOfferings>> {
  const runtime = await getReadyPurchases();
  if (!runtime.available) return runtime;
  return { available: true, value: await runtime.purchases.getOfferings() };
}

/** Fetch packages from the current offering without inventing product identifiers in app code. */
export async function getAvailablePackages(): Promise<NativePurchasesResult<PurchasesPackage[]>> {
  const offerings = await getOfferings();
  if (!offerings.available) return offerings;
  return { available: true, value: offerings.value.current?.availablePackages ?? [] };
}

/** Purchase one of the packages returned by getOfferings(). */
export async function purchasePackage(
  aPackage: PurchasesPackage,
): Promise<NativePurchasesResult<MakePurchaseResult>> {
  const runtime = await getReadyPurchases();
  if (!runtime.available) return runtime;
  return { available: true, value: await runtime.purchases.purchasePackage({ aPackage }) };
}

/** Restore purchases from the App Store and return the refreshed customer information. */
export async function restorePurchases(): Promise<NativePurchasesResult<CustomerInfo>> {
  const runtime = await getReadyPurchases();
  if (!runtime.available) return runtime;
  const { customerInfo } = await runtime.purchases.restorePurchases();
  return { available: true, value: customerInfo };
}

/** Check the active status of the configured Pro entitlement. */
export async function checkCurrentEntitlementStatus(): Promise<NativePurchasesResult<boolean>> {
  const runtime = await getReadyPurchases();
  if (!runtime.available) return runtime;
  const { customerInfo } = await runtime.purchases.getCustomerInfo();
  return {
    available: true,
    value: Boolean(customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.isActive),
  };
}
