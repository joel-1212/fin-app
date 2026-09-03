"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { CustomerInfo, PurchasesPackage, PurchasesOfferings } from "@revenuecat/purchases-capacitor";
import { Icon } from "@/components/Icon";
import { refreshProStatus } from "@/lib/entitlement";
import {
  checkCurrentEntitlementStatus,
  getOfferings,
  initializePurchases,
  purchasePackage,
  REVENUECAT_ENTITLEMENT_ID,
  restorePurchases,
} from "@/lib/purchases";

type ViewState = "loading" | "ready" | "browser" | "unavailable" | "error";
type BusyAction = "purchase" | "restore" | null;

const copy = {
  pageLabel: "Fin Pro",
  title: "\u81ea\u5206\u306e\u30da\u30fc\u30b9\u3067\u3001\u632f\u308a\u8fd4\u308a\u3092\u7d9a\u3051\u308b",
  intro: "\u7121\u6599\u306e\u307e\u307e\u3067\u3082\u3001\u65e5\u3005\u306e\u30bf\u30b9\u30af\u306b\u5fc5\u8981\u306a\u6a5f\u80fd\u3092\u4f7f\u3048\u307e\u3059\u3002",
  freeTitle: "\u7121\u6599\u3067\u3067\u304d\u308b\u3053\u3068",
  freeDescription: "\u65e5\u3005\u306e\u9032\u3081\u65b9\u306b\u5fc5\u8981\u306a\u6a5f\u80fd\u3067\u3059\u3002",
  proTitle: "Pro\u3067\u89e3\u653e\u3055\u308c\u308b\u3053\u3068",
  proDescription: "\u632f\u308a\u8fd4\u308a\u3092\u7a4d\u307f\u91cd\u306d\u305f\u3044\u3068\u304d\u306b\u3002",
  taskManagement: "\u30bf\u30b9\u30af\u7ba1\u7406",
  scheduledFinish: "\u7d42\u4e86\u4e88\u5b9a\u6642\u523b",
  countdown: "\u30ab\u30a6\u30f3\u30c8\u30c0\u30a6\u30f3",
  todaysHistory: "\u4eca\u65e5\u306e\u307e\u3068\u3081",
  templateLimit: "\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u30923\u3064\u307e\u3067\u4fdd\u5b58",
  performanceReports: "\u65e5\u4ed8\u3054\u3068\u306e\u5c65\u6b74\u3068\u5b9f\u7e3e\u30ec\u30dd\u30fc\u30c8",
  savedRoutines: "\u898b\u7a4d\u3082\u308a\u306e\u63d0\u6848",
  pastHistory: "\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u306e\u7121\u5236\u9650\u4fdd\u5b58",
  cta: "Pro\u3092\u8cfc\u5165\u3059\u308b",
  restore: "\u8cfc\u5165\u3092\u5fa9\u5143\u3059\u308b",
  retry: "\u3082\u3046\u4e00\u5ea6\u8aad\u307f\u8fbc\u3080",
  loading: "\u8cfc\u5165\u3067\u304d\u308b\u30d7\u30e9\u30f3\u3092\u8aad\u307f\u8fbc\u3093\u3067\u3044\u307e\u3059\u3002",
  browser: "\u30b5\u30d6\u30b9\u30af\u30ea\u30d7\u30b7\u30e7\u30f3\u306e\u8cfc\u5165\u306f iOS \u30a2\u30d7\u30ea\u5185\u3067\u306e\u307f\u5229\u7528\u3067\u304d\u307e\u3059\u3002Fin \u306e iOS \u30a2\u30d7\u30ea\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002",
  missingKey: "\u8cfc\u5165\u6a5f\u80fd\u3092\u521d\u671f\u5316\u3067\u304d\u307e\u305b\u3093\u3002\u30a2\u30d7\u30ea\u3092\u6700\u65b0\u306e\u8a2d\u5b9a\u3067\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  error: "\u8cfc\u5165\u60c5\u5831\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u901a\u4fe1\u72b6\u614b\u3092\u78ba\u8a8d\u3057\u3066\u3001\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
  errorDetailLabel: "\u8a73\u7d30",
  noPackages: "\u73fe\u5728\u8cfc\u5165\u3067\u304d\u308b\u30d7\u30e9\u30f3\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u3057\u3070\u3089\u304f\u5f85\u3063\u3066\u304b\u3089\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  noOffering: "RevenueCat \u306e\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9\u3067\u8cfc\u5165\u30d7\u30e9\u30f3\u304c\u8a2d\u5b9a\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002",
  purchaseError: "\u8cfc\u5165\u3092\u5b8c\u4e86\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u8cfc\u5165\u753b\u9762\u306e\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  purchased: "Pro \u306e\u8cfc\u5165\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002",
  restored: "\u8cfc\u5165\u3092\u5fa9\u5143\u3057\u307e\u3057\u305f\u3002",
  noPurchaseToRestore: "\u5fa9\u5143\u3067\u304d\u308b Pro \u306e\u8cfc\u5165\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002",
  active: "Pro \u306f\u6709\u52b9\u3067\u3059",
  monthly: "\u6708\u984d",
  annual: "\u5e74\u984d",
  weekly: "\u9031\u984d",
  subscription: "\u30b5\u30d6\u30b9\u30af\u30ea\u30d7\u30b7\u30e7\u30f3",
  priceDisclosureFallback: "\u6700\u7d42\u7684\u306a\u91d1\u984d\u306f\u3001\u8cfc\u5165\u78ba\u8a8d\u753b\u9762\u306b\u8868\u793a\u3055\u308c\u308b App Store \u306e\u4fa1\u683c\u304c\u9069\u7528\u3055\u308c\u307e\u3059\u3002",
  priceDisclosureSuffix: "\u8868\u793a\u4fa1\u683c\u306f App Store \u30a2\u30ab\u30a6\u30f3\u30c8\u306e\u56fd\u3068\u901a\u8ca8\u306b\u3088\u3063\u3066\u5909\u308f\u308a\u307e\u3059\u3002\u6700\u7d42\u7684\u306a\u91d1\u984d\u306f\u8cfc\u5165\u78ba\u8a8d\u753b\u9762\u306e\u8868\u793a\u304c\u9069\u7528\u3055\u308c\u307e\u3059\u3002",
  renewalDisclosure: "\u8cfc\u5165\u3092\u78ba\u8a8d\u3059\u308b\u3068 Apple ID \u306b\u8acb\u6c42\u3055\u308c\u3001\u671f\u9593\u7d42\u4e86\u306e 24 \u6642\u9593\u524d\u307e\u3067\u306b\u81ea\u52d5\u66f4\u65b0\u3092\u89e3\u9664\u3057\u306a\u3044\u9650\u308a\u81ea\u52d5\u66f4\u65b0\u3055\u308c\u307e\u3059\u3002\u89e3\u7d04\u306f iPhone \u306e\u300c\u8a2d\u5b9a\u300d\u304b\u3089 Apple Account \u306e\u30b5\u30d6\u30b9\u30af\u30ea\u30d7\u30b7\u30e7\u30f3\u3092\u7ba1\u7406\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  terms: "\u5229\u7528\u898f\u7d04",
  privacy: "\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u30dd\u30ea\u30b7\u30fc",
} as const;

const freeFeatures = [copy.taskManagement, copy.scheduledFinish, copy.countdown, copy.todaysHistory, copy.templateLimit];
const proFeatures = [copy.performanceReports, copy.savedRoutines, copy.pastHistory];

export default function Page() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [proActive, setProActive] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPurchases() {
      setViewState("loading");
      setErrorMessage(null);
      setErrorDetail(null);
      setNoticeMessage(null);
      const initialization = await initializePurchases();
      if (cancelled) return;
      if (!initialization.available) {
        setViewState(initialization.reason === "browser" ? "browser" : "unavailable");
        return;
      }

      const offeringsResult = await getOfferings();
      if (cancelled) return;
      if (!offeringsResult.available) {
        setViewState(offeringsResult.reason === "browser" ? "browser" : "unavailable");
        return;
      }

      // 権利の確認に失敗しても購入導線は出す。ここで倒すと、まだ買っていない人が
      // 「買えない画面」に閉じ込められる。既に買っている人には復元ボタンが残る。
      const entitlementResult = await checkCurrentEntitlementStatus().catch(() => null);
      if (cancelled) return;

      setOfferings(offeringsResult.value);
      setProActive(entitlementResult?.available ? entitlementResult.value : false);
      setSelectedPackageId(selectPreferredPackageId(offeringsResult.value));
      setViewState("ready");
    }

    // 実機では原因が一切見えないので、ブリッジが返した理由をそのまま残す。
    // 「通信状態を確認して」だけだと、実際は RevenueCat の商品未設定でも
    // 通信を疑い続けることになる。
    void loadPurchases().catch((error: unknown) => {
      if (cancelled) return;
      setErrorDetail(describeError(error));
      setViewState("error");
    });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retry = () => setReloadToken((token) => token + 1);

  const packages = useMemo(() => offerings?.current?.availablePackages ?? [], [offerings]);
  const selectedPackage = packages.find((aPackage) => aPackage.identifier === selectedPackageId) ?? null;

  async function handlePurchase() {
    if (!selectedPackage || busyAction !== null) return;
    setBusyAction("purchase");
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const result = await purchasePackage(selectedPackage);
      if (!result.available) {
        setViewState(result.reason === "browser" ? "browser" : "unavailable");
        return;
      }
      const active = isProEntitled(result.value.customerInfo);
      setProActive(active);
      // 他の画面はこの通知でしか購入を知れない。呼ばないと、戻った先が無料表示のまま。
      void refreshProStatus();
      setNoticeMessage(active ? copy.purchased : copy.purchaseError);
    } catch (error: unknown) {
      // 購入シートを自分で閉じた場合もここに来る。これは失敗ではないので、
      // 赤いエラーを出さずに黙って元の画面に戻す。
      if (!isPurchaseCancellation(error)) setErrorMessage(copy.purchaseError);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRestore() {
    if (busyAction !== null) return;
    setBusyAction("restore");
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const result = await restorePurchases();
      if (!result.available) {
        setViewState(result.reason === "browser" ? "browser" : "unavailable");
        return;
      }
      const active = isProEntitled(result.value);
      setProActive(active);
      void refreshProStatus();
      setNoticeMessage(active ? copy.restored : copy.noPurchaseToRestore);
    } catch {
      setErrorMessage(copy.error);
    } finally {
      setBusyAction(null);
    }
  }

  const statusMessage = getStatusMessage(viewState);

  return (
    <main
      style={{
        alignItems: "center",
        background: "var(--bg)",
        color: "var(--fg)",
        display: "flex",
        flexDirection: "column",
        gap: 30,
        minHeight: "100dvh",
        padding: "32px 24px 56px",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", maxWidth: 620, width: "100%" }}>
        <Link href="/" style={backLinkStyle}>
          <Icon name="arrow_back" size={17} weight={350} color="currentColor" />
          <span>ホームへ戻る</span>
        </Link>
      </div>

      <section
        aria-labelledby="screen-6-title"
        style={{
          background: "var(--sheet)",
          border: "1px solid var(--fg-14)",
          borderRadius: 32,
          boxShadow: "0 18px 44px var(--fg-14)",
          maxWidth: 620,
          padding: "clamp(28px, 6vw, 52px)",
          width: "100%",
        }}
      >
        <header style={{ textAlign: "center" }}>
          <div style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700, letterSpacing: ".14em" }}>
            {copy.pageLabel}
          </div>
          <h1
            id="screen-6-title"
            style={{
              fontSize: "clamp(1.75rem, 5vw, 2.45rem)",
              fontWeight: 600,
              letterSpacing: "-.04em",
              lineHeight: 1.24,
              margin: "14px auto 14px",
              maxWidth: 440,
            }}
          >
            {copy.title}
          </h1>
          <p style={{ color: "var(--fg-60)", fontSize: 14, lineHeight: 1.75, margin: "0 auto", maxWidth: 440 }}>
            {copy.intro}
          </p>
        </header>

        <div style={{ display: "grid", gap: 14, marginTop: 32 }}>
          <FeatureGroup description={copy.freeDescription} features={freeFeatures} label="FREE" title={copy.freeTitle} />
          <FeatureGroup
            description={copy.proDescription}
            features={proFeatures}
            label="PRO"
            title={copy.proTitle}
            highlighted
          />
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 30 }}>
          {statusMessage && (
            <StatusBox tone={viewState === "error" ? "error" : "neutral"}>
              {statusMessage}
            </StatusBox>
          )}

          {viewState === "ready" && (
            <>
              {proActive && <StatusBox tone="success">{copy.active}</StatusBox>}
              {packages.length === 0 ? (
                <StatusBox tone="neutral">{offerings?.current ? copy.noPackages : copy.noOffering}</StatusBox>
              ) : (
                <div aria-label="Pro plans" role="radiogroup" style={{ display: "grid", gap: 10 }}>
                  {packages.map((aPackage) => (
                    <PackageOption
                      key={aPackage.identifier}
                      aPackage={aPackage}
                      selected={aPackage.identifier === selectedPackageId}
                      onSelect={() => setSelectedPackageId(aPackage.identifier)}
                    />
                  ))}
                </div>
              )}
              {errorMessage && <StatusBox tone="error">{errorMessage}</StatusBox>}
              {noticeMessage && <StatusBox tone="success">{noticeMessage}</StatusBox>}
              <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  type="button"
                  disabled={proActive || selectedPackage === null || busyAction !== null}
                  onClick={() => void handlePurchase()}
                  style={{ ...primaryButtonStyle, opacity: proActive || selectedPackage === null || busyAction !== null ? 0.55 : 1 }}
                >
                  {busyAction === "purchase" ? "\u8cfc\u5165\u4e2d..." : proActive ? copy.active : copy.cta}
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void handleRestore()}
                  style={{ ...secondaryButtonStyle, opacity: busyAction !== null ? 0.55 : 1 }}
                >
                  {busyAction === "restore" ? "\u5fa9\u5143\u4e2d..." : copy.restore}
                </button>
              </div>
            </>
          )}

          {viewState === "browser" && <StatusBox tone="neutral">{copy.browser}</StatusBox>}
          {viewState === "unavailable" && <StatusBox tone="error">{copy.missingKey}</StatusBox>}
          {viewState === "error" && (
            <StatusBox tone="error">
              {copy.error}
              {errorDetail && (
                <span style={{ color: "var(--fg-50)", display: "block", fontSize: 11, marginTop: 6 }}>
                  {copy.errorDetailLabel}: {errorDetail}
                </span>
              )}
            </StatusBox>
          )}

          {/*
            購入導線が出せない状態でも、行き止まりにしない。
            再読み込みと購入の復元は常に残す（復元は App Review の要件でもある）。
          */}
          {(viewState === "unavailable" || viewState === "error") && (
            <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 12 }}>
              <button type="button" onClick={retry} style={primaryButtonStyle}>
                {copy.retry}
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleRestore()}
                style={{ ...secondaryButtonStyle, opacity: busyAction !== null ? 0.55 : 1 }}
              >
                {busyAction === "restore" ? "復元中..." : copy.restore}
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--fg-14)",
            color: "var(--fg-50)",
            fontSize: 12,
            lineHeight: 1.75,
            marginTop: 30,
            paddingTop: 20,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>{buildPriceDisclosure(packages)}</p>
          <p style={{ margin: "0 0 8px" }}>{copy.renewalDisclosure}</p>
          <p style={{ margin: 0 }}>
            <a href="/terms" style={legalLinkStyle}>{copy.terms}</a>
            {" / "}
            <a href="/privacy" style={legalLinkStyle}>{copy.privacy}</a>
          </p>
        </div>
      </section>
    </main>
  );
}

/**
 * 料金の注意書きは App Store が返した実価格から組み立てる。
 * 以前は「月額 ¥480 / 年額 ¥4,800」をベタ書きしていたが、価格は国ごとに
 * 現地通貨で設定されている（米国 $2.99・英国 £2.99 など）。円で固定すると、
 * 実際には別通貨で課金される利用者に嘘の金額を見せることになる。
 */
function buildPriceDisclosure(packages: PurchasesPackage[]): string {
  const prices = packages
    .map((aPackage) => {
      const price = aPackage.product.priceString;
      return price ? `${formatPackagePeriod(aPackage)} ${price}` : null;
    })
    .filter((entry): entry is string => entry !== null);

  if (prices.length === 0) return copy.priceDisclosureFallback;
  return `料金は ${prices.join(" / ")} です。${copy.priceDisclosureSuffix}`;
}

/**
 * 利用者が購入シートを閉じたときも purchasePackage は reject する。
 * RevenueCat はこれを「エラー」として返すが、利用者にとっては失敗ではない。
 * SDK・OS のバージョンで形が揃わないので、判る手掛かりを全部見る。
 */
function isPurchaseCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message, readableErrorCode, userCancelled } = error as {
    code?: unknown;
    message?: unknown;
    readableErrorCode?: unknown;
    userCancelled?: unknown;
  };
  if (userCancelled === true) return true;
  if (String(code) === "1") return true;
  if (String(readableErrorCode) === "PURCHASE_CANCELLED_ERROR") return true;
  return typeof message === "string" && /cancel/i.test(message);
}

/** ネイティブから来る例外は形が揃わないので、表示できる文字列まで落とす。 */
function describeError(error: unknown): string | null {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (typeof message === "string" && message) {
      return typeof code === "string" || typeof code === "number" ? `${message} (${code})` : message;
    }
  }
  return null;
}

function getStatusMessage(viewState: ViewState) {
  return viewState === "loading" ? copy.loading : null;
}

function isProEntitled(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.isActive);
}

function selectPreferredPackageId(offerings: PurchasesOfferings) {
  const packages = offerings.current?.availablePackages ?? [];
  return (
    packages.find((aPackage) => String(aPackage.packageType) === "MONTHLY")?.identifier ??
    packages.find((aPackage) => String(aPackage.packageType) === "ANNUAL")?.identifier ??
    packages[0]?.identifier ??
    null
  );
}

function formatPackagePeriod(aPackage: PurchasesPackage) {
  const type = String(aPackage.packageType);
  if (type === "MONTHLY") return copy.monthly;
  if (type === "ANNUAL") return copy.annual;
  if (type === "WEEKLY") return copy.weekly;
  return aPackage.product.subscriptionPeriod ?? copy.subscription;
}

function PackageOption({
  aPackage,
  onSelect,
  selected,
}: {
  aPackage: PurchasesPackage;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-checked={selected}
      role="radio"
      type="button"
      onClick={onSelect}
      style={{
        alignItems: "center",
        background: "var(--bg)",
        border: selected ? "1px solid var(--accent)" : "1px solid var(--fg-14)",
        borderRadius: 18,
        color: "var(--fg)",
        cursor: "pointer",
        display: "flex",
        font: "inherit",
        justifyContent: "space-between",
        padding: "15px 17px",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{formatPackagePeriod(aPackage)}</span>
        <span style={{ color: "var(--fg-50)", fontSize: 11 }}>{aPackage.product.title}</span>
      </span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{aPackage.product.priceString || "App Store"}</span>
    </button>
  );
}

function StatusBox({ children, tone }: { children: ReactNode; tone: "error" | "neutral" | "success" }) {
  const colors = {
    error: { background: "rgba(190, 70, 70, .1)", border: "rgba(190, 70, 70, .35)" },
    neutral: { background: "var(--bg)", border: "var(--fg-14)" },
    success: { background: "var(--bg)", border: "var(--accent)" },
  } as const;
  return (
    <p
      aria-live="polite"
      style={{
        background: colors[tone].background,
        border: `1px solid ${colors[tone].border}`,
        borderRadius: 16,
        color: "var(--fg-60)",
        fontSize: 13,
        lineHeight: 1.65,
        margin: 0,
        padding: "12px 14px",
      }}
    >
      {children}
    </p>
  );
}

const primaryButtonStyle = {
  background: "var(--accent)",
  border: "1px solid var(--accent)",
  borderRadius: 999,
  color: "var(--bg)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  padding: "13px 22px",
};

const secondaryButtonStyle = {
  background: "transparent",
  border: "1px solid var(--fg-14)",
  borderRadius: 999,
  color: "var(--fg)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  padding: "10px 18px",
};

const backLinkStyle = {
  alignItems: "center",
  background: "var(--bg)",
  border: "1px solid var(--fg-14)",
  borderRadius: 999,
  color: "var(--fg-50)",
  display: "inline-flex",
  fontSize: 12.5,
  fontWeight: 600,
  gap: 6,
  padding: "8px 11px",
  textDecoration: "none",
};

const legalLinkStyle = { color: "var(--fg)", textDecoration: "underline" };

function FeatureGroup({
  description,
  features,
  highlighted = false,
  label,
  title,
}: {
  description: string;
  features: readonly string[];
  highlighted?: boolean;
  label: string;
  title: string;
}) {
  return (
    <section
      style={{
        background: "var(--bg)",
        border: highlighted ? "1px solid var(--accent)" : "1px solid var(--fg-14)",
        borderRadius: 22,
        padding: "20px clamp(18px, 4vw, 24px)",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 9, justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, fontWeight: 650, letterSpacing: "-.015em", margin: 0 }}>{title}</h2>
        <span
          style={{
            background: highlighted ? "var(--accent)" : "var(--fg-14)",
            borderRadius: 999,
            color: highlighted ? "var(--bg)" : "var(--fg-60)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".1em",
            padding: "5px 8px",
          }}
        >
          {label}
        </span>
      </div>
      <p style={{ color: "var(--fg-50)", fontSize: 13, lineHeight: 1.65, margin: "7px 0 16px" }}>{description}</p>
      <ul style={{ display: "grid", gap: 10, listStyle: "none", margin: 0, padding: 0 }}>
        {features.map((feature) => (
          <li key={feature} style={{ alignItems: "center", color: "var(--fg)", display: "flex", fontSize: 14, gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                alignItems: "center",
                background: highlighted ? "var(--accent)" : "var(--fg-14)",
                borderRadius: "50%",
                color: highlighted ? "var(--bg)" : "var(--fg-60)",
                display: "inline-flex",
                flex: "0 0 auto",
                fontSize: 12,
                height: 20,
                justifyContent: "center",
                width: 20,
              }}
            >
              {"\u2713"}
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </section>
  );
}

