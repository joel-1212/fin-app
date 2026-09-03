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

/**
 * ネイティブブリッジが一度も返事をしない場合に、画面が「読み込み中」のまま
 * 固まるのを防ぐ。通知で実際に起きた症状と同じ形なので、購入側にも入れておく。
 */
const NATIVE_CALL_TIMEOUT_MS = 12_000;

export class PurchasesTimeoutError extends Error {
  constructor(operation: string) {
    super(`RevenueCat の ${operation} が応答しませんでした`);
    this.name = "PurchasesTimeoutError";
  }
}

function withTimeout<T>(operation: string, work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new PurchasesTimeoutError(operation)), NATIVE_CALL_TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Capacitor の registerPlugin が返すプロキシは、あらゆるプロパティ名に応答するため
 * `then` にも関数を返してしまう（thenable になる）。async 関数からそのまま return
 * すると Promise 機構が偽の then() を呼び、await が永遠に返らない。
 * 通知（lib/notifications.ts）で実際にこれに当たっているので、購入側でも
 * 素のオブジェクトに包み直して thenable 性を断つ。
 */
function toPlainPurchasesApi(plugin: PurchasesPlugin): PurchasesPlugin {
  return {
    ...plugin,
    configure: (options) => plugin.configure(options),
    getCustomerInfo: () => plugin.getCustomerInfo(),
    getOfferings: () => plugin.getOfferings(),
    isConfigured: () => plugin.isConfigured(),
    purchasePackage: (options) => plugin.purchasePackage(options),
    restorePurchases: () => plugin.restorePurchases(),
  } as PurchasesPlugin;
}

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
      const module = await loadPurchasesModule();
      const purchases = toPlainPurchasesApi(module.Purchases);
      const { isConfigured } = await withTimeout("isConfigured", purchases.isConfigured());
      if (!isConfigured) await withTimeout("configure", purchases.configure({ apiKey: publicApiKey }));
      return { available: true, purchases };
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
  return { available: true, value: await withTimeout("getOfferings", runtime.purchases.getOfferings()) };
}

/** Fetch packages from the current offering without inventing product identifiers in app code. */
export async function getAvailablePackages(): Promise<NativePurchasesResult<PurchasesPackage[]>> {
  const offerings = await getOfferings();
  if (!offerings.available) return offerings;
  return { available: true, value: offerings.value.current?.availablePackages ?? [] };
}

/**
 * Purchase one of the packages returned by getOfferings().
 * ここだけはタイムアウトを掛けない。App Store の購入シートは利用者が操作を終えるまで
 * 返らないのが正常で、打ち切ると成立した購入を取りこぼす。
 */
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
  const { customerInfo } = await withTimeout("restorePurchases", runtime.purchases.restorePurchases());
  return { available: true, value: customerInfo };
}

/** Check the active status of the configured Pro entitlement. */
export async function checkCurrentEntitlementStatus(): Promise<NativePurchasesResult<boolean>> {
  const runtime = await getReadyPurchases();
  if (!runtime.available) return runtime;
  const { customerInfo } = await withTimeout("getCustomerInfo", runtime.purchases.getCustomerInfo());
  return {
    available: true,
    value: Boolean(customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.isActive),
  };
}
