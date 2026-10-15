"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  ReceiptText,
  Package,
  Megaphone,
  TrendingUp,
  Store,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  badge?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="shop-brand"]',
    title: "Your Shop Workspace",
    description:
      "This is your shop portal. All your inventory, sales, staff, and settings are securely tied to your business.",
    badge: "Overview",
  },
  {
    targetSelector: '[data-tour="branch-switcher"]',
    title: "Multi-Branch Switcher",
    description:
      "Switch between your shop branches anytime. When you switch, inventory stock, transactions, and staff data instantly scope to that branch.",
    badge: "Multi-Branch",
  },
  {
    targetSelector: '[data-tour="nav-transaction"]',
    title: "POS & Sales Register",
    description:
      "Quickly search products, type or step quantities, choose payment (Cash, MoMo, Card, or Pay Later), and send instant SMS digital receipts to customers.",
    badge: "Core Feature",
  },
  {
    targetSelector: '[data-tour="nav-inventory"]',
    title: "Inventory & Stock Control",
    description:
      "Track product prices, cost prices, quantities, and low stock warnings. Staff can view available items and restock per branch.",
    badge: "Inventory",
  },
  {
    targetSelector: '[data-tour="nav-transactions-list"]',
    title: "Audit Sales, Receipts & Refunds",
    description:
      "Search past sales by receipt number or customer name. Swap items or issue refunds with mandatory audit notes to keep your books balanced.",
    badge: "Audit & Receipts",
  },
  {
    targetSelector: '[data-tour="nav-broadcast"]',
    title: "Targeted SMS Broadcasts",
    description:
      "Customer phone numbers are automatically saved when they buy. Send promotional offers or alerts to all your customers or only specific branches.",
    badge: "Marketing",
  },
  {
    targetSelector: '[data-tour="nav-reports"]',
    title: "Reports & Financial Health",
    description:
      "Real-time analytics on revenue, cash vs MoMo breakdown, profit margins, and tracked shop expenses.",
    badge: "Analytics",
  },
  {
    targetSelector: '[data-tour="nav-workers"]',
    title: "Staff & Permission Control",
    description:
      "Add workers, assign them to branches, set custom roles, and easily approve staff password reset requests.",
    badge: "Staff Management",
  },
];

interface TutorialContextType {
  isTourActive: boolean;
  isHubOpen: boolean;
  startTour: () => void;
  stopTour: () => void;
  openHub: () => void;
  closeHub: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return ctx;
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);

  const startTour = useCallback(() => {
    setIsHubOpen(false);
    setIsTourActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsTourActive(false);
    try {
      localStorage.setItem("nsesa_tour_seen", "true");
    } catch {}
  }, []);

  const openHub = useCallback(() => setIsHubOpen(true), []);
  const closeHub = useCallback(() => setIsHubOpen(false), []);

  return (
    <TutorialContext.Provider
      value={{
        isTourActive,
        isHubOpen,
        startTour,
        stopTour,
        openHub,
        closeHub,
      }}
    >
      {children}
      <GuidedTourOverlay
        isOpen={isTourActive}
        onClose={stopTour}
        steps={TOUR_STEPS}
      />
      <TutorialsHubModal
        open={isHubOpen}
        onClose={closeHub}
        onStartTour={startTour}
      />
    </TutorialContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Interactive Guided Tour Spotlight Overlay
// -----------------------------------------------------------------------------
export function GuidedTourOverlay({
  isOpen,
  onClose,
  steps,
  onStepChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  steps: TourStep[];
  onStepChange?: (step: TourStep, idx: number) => void;
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStepIdx];

  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIdx(0);
      setTargetRect(null);
      return;
    }
    if (step && onStepChange) {
      onStepChange(step, currentStepIdx);
    }
    // Allow small delay for mobile drawer / layout transitions to finish before measuring rect
    const timer = setTimeout(() => {
      updateTargetRect();
    }, 250);

    const handleResize = () => updateTargetRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, currentStepIdx, step, onStepChange, updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        if (currentStepIdx < steps.length - 1) setCurrentStepIdx((i) => i + 1);
        else onClose();
      } else if (e.key === "ArrowLeft") {
        if (currentStepIdx > 0) setCurrentStepIdx((i) => i - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIdx, steps.length, onClose]);

  if (!isOpen || !step) return null;

  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === steps.length - 1;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Tooltip positioning
  let tooltipStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        width: "auto",
        maxWidth: "420px",
        margin: "0 auto",
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };

  if (!isMobile && targetRect) {
    const spaceRight = window.innerWidth - targetRect.right;
    const spaceBottom = window.innerHeight - targetRect.bottom;

    if (spaceRight > 380) {
      tooltipStyle = {
        position: "fixed",
        top: Math.max(20, Math.min(window.innerHeight - 300, targetRect.top - 10)),
        left: targetRect.right + 18,
      };
    } else if (spaceBottom > 240) {
      tooltipStyle = {
        position: "fixed",
        top: targetRect.bottom + 16,
        left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left)),
      };
    } else {
      tooltipStyle = {
        position: "fixed",
        bottom: window.innerHeight - targetRect.top + 16,
        left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left)),
      };
    }
  }

  return (
    <div className="fixed inset-0 z-[120] pointer-events-auto">
      {/* Razor-sharp Cutout Spotlight: The target is crystal clear with 0 blur! */}
      {targetRect ? (
        <div
          className="fixed rounded-xl pointer-events-none transition-all duration-300 ring-4 ring-emerald-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.65),0_0_30px_rgba(16,185,129,0.5)] z-[121]"
          style={{
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/65 transition-opacity z-[120]" />
      )}

      {/* Info Card */}
      <div
        style={tooltipStyle}
        className="rounded-2xl bg-white border border-zinc-200 shadow-2xl p-5 sm:p-6 z-[125] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
              {step.badge || "Guide"}
            </span>
            <span className="text-xs font-semibold text-zinc-500">
              {currentStepIdx + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md transition-colors"
            title="Skip Tour (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-base font-heading font-bold text-zinc-900 mb-1.5">
          {step.title}
        </h3>
        <p className="text-xs leading-relaxed text-zinc-600 mb-5">
          {step.description}
        </p>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                Back
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (isLast) onClose();
                else setCurrentStepIdx((i) => i + 1);
              }}
              className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Finish
                </>
              ) : (
                <>
                  Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Tutorials & Guides Hub Modal
// -----------------------------------------------------------------------------
interface GuideItem {
  id: string;
  icon: React.ElementType;
  title: string;
  category: string;
  summary: string;
  steps: string[];
  proTip?: string;
}

const GUIDES: GuideItem[] = [
  {
    id: "pos",
    icon: ReceiptText,
    category: "Transactions",
    title: "How to Record a Sale & Issue Instant SMS Receipts",
    summary:
      "Complete a transaction on any phone or computer in under 15 seconds.",
    steps: [
      "Select an existing customer or type a new customer phone number (SMS will automatically send to this number).",
      "Click products from your inventory list. You can type quantities directly (e.g., 21 or 150) or tap the + / - buttons.",
      "Select the payment mode: Cash, MoMo, Card, or toggle 'Pay Later' for unpaid credit orders.",
      "Click 'Complete Transaction'. A digital receipt with your shop's branding is created and sent via SMS immediately.",
    ],
    proTip: "No extra hardware needed. The SMS receipt acts as proof of purchase with full itemization and balance.",
  },
  {
    id: "branches",
    icon: Store,
    category: "Multi-Branch",
    title: "Operating Across Multiple Branches",
    summary:
      "Manage multiple retail branches with separate stock, staff, and sales records.",
    steps: [
      "In the sidebar, locate the Branch badge directly under your shop name.",
      "Click the badge to see all branches. Select any branch to switch your active view.",
      "When adding stock or reviewing sales, items are automatically locked to that specific branch.",
      "Admin owners have global access across all branches, while assigned workers only see their branch.",
    ],
    proTip: "Super-Admins can create unlimited branches with branch-specific addresses and phone contacts.",
  },
  {
    id: "inventory",
    icon: Package,
    category: "Inventory",
    title: "Adding Products, SKUs & Tracking Stock Levels",
    summary: "Prevent stock shortages and maintain accurate pricing per branch.",
    steps: [
      "Go to Inventory and click '+ Add Product'.",
      "Enter Product Name, Selling Price, Cost Price, and Initial Stock.",
      "Optionally assign a unique SKU / Barcode for quick scanner lookup.",
      "When an item hits 0 stock, it automatically marks as 'Out of Stock' so staff cannot over-sell.",
    ],
    proTip: "You can do bulk CSV uploads under Inventory to import hundreds of items at once.",
  },
  {
    id: "audit",
    icon: RotateCcw,
    category: "Auditing",
    title: "Managing Past Receipts, Item Swaps & Refunds",
    summary:
      "Full transparency: modify mistaken sales or issue customer refunds with audit trails.",
    steps: [
      "Navigate to 'View Transactions' to view every receipt ever issued.",
      "Click 'Manage' on any order: you can choose between Edit, Refund, or Delete.",
      "When editing items, quantities or swapped products automatically re-adjust stock.",
      "A mandatory audit reason is required, preventing unauthorized staff manipulation.",
    ],
    proTip: "You can click 'Resend Receipt' anytime if a customer lost their SMS receipt.",
  },
  {
    id: "broadcast",
    icon: Megaphone,
    category: "Marketing",
    title: "Sending Targeted SMS Marketing Campaigns",
    summary:
      "Bring repeat customers back with targeted SMS announcements and discounts.",
    steps: [
      "Go to 'Send SMS' from the sidebar.",
      "Select your audience: choose 'Specific Branch' or 'All Shop Branches'.",
      "Type your announcement or promotion (160 characters per SMS credit).",
      "Click Send. All matching customer phone numbers stored from previous transactions receive the message.",
    ],
    proTip: "Sender ID appears with your shop's registered name so customers instantly recognize you.",
  },
  {
    id: "reports",
    icon: TrendingUp,
    category: "Analytics",
    title: "Monitoring Daily Revenue, Profits & Expenses",
    summary:
      "Know exactly how much money your business makes every single day.",
    steps: [
      "Open 'Financial Reports' or 'Overview' for live graphs of daily and weekly revenue.",
      "View payment breakdowns: see how much arrived via MTN/Telecel MoMo vs physical Cash.",
      "Log daily operational expenses (rent, transport, utilities) under 'Expenses'.",
      "Your reports automatically calculate Net Profit = Gross Sales - Cost of Goods - Expenses.",
    ],
    proTip: "Use the date range picker to filter performance by today, this week, or custom months.",
  },
];

export function TutorialsHubModal({
  open,
  onClose,
  onStartTour,
}: {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}) {
  const [selectedGuideId, setSelectedGuideId] = useState<string>("pos");

  if (!open) return null;

  const activeGuide = GUIDES.find((g) => g.id === selectedGuideId) || GUIDES[0];
  const ActiveIcon = activeGuide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-green-800 via-green-900 to-emerald-950 text-white shrink-0 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/30 text-green-200 text-xs font-semibold ring-1 ring-white/20">
                <Sparkles className="h-3.5 w-3.5 text-green-300" />
                Knowledge Base & Tour
              </span>
            </div>
            <h2 className="text-xl font-heading font-bold text-white">
              Nsesa Master Guide & Tutorials
            </h2>
            <p className="text-xs text-green-100/80">
              Interactive training on how to use every feature in your shop portal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={onStartTour}
              className="hidden sm:inline-flex items-center gap-2 bg-white text-green-900 hover:bg-green-50 font-bold text-xs h-9 px-3.5 shadow-sm rounded-xl cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start Interactive Tour
            </Button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tour Button */}
        <div className="sm:hidden px-4 py-2.5 bg-green-50 border-b border-green-100 flex items-center justify-between">
          <span className="text-xs text-green-800 font-medium">
            Want a live screen walkthrough?
          </span>
          <Button
            type="button"
            size="sm"
            onClick={onStartTour}
            className="h-7 text-xs bg-green-700 hover:bg-green-800 text-white font-semibold"
          >
            <Play className="h-3 w-3 mr-1 fill-current" /> Live Tour
          </Button>
        </div>

        {/* Body content: split left list, right detail */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Guide Selector sidebar */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-200 bg-zinc-50/70 overflow-y-auto p-3 space-y-1.5 shrink-0 max-h-48 md:max-h-full">
            <p className="px-2 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Core Modules
            </p>
            {GUIDES.map((g) => {
              const Icon = g.icon;
              const isSelected = g.id === selectedGuideId;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGuideId(g.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer text-xs",
                    isSelected
                      ? "bg-white text-green-950 font-bold shadow-xs border border-zinc-200/80 ring-1 ring-green-600/20"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      isSelected
                        ? "bg-green-100 text-green-800"
                        : "bg-zinc-200/60 text-zinc-500"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{g.title}</p>
                    <p className="text-[10px] text-zinc-400">{g.category}</p>
                  </div>
                  {isSelected && (
                    <ChevronRight className="h-3.5 w-3.5 text-green-700 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Guide Detail view */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-green-100 text-green-800 flex items-center justify-center shrink-0 shadow-xs">
                <ActiveIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                  {activeGuide.category}
                </span>
                <h3 className="text-lg font-heading font-bold text-zinc-900 leading-snug">
                  {activeGuide.title}
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {activeGuide.summary}
                </p>
              </div>
            </div>

            {/* Step by Step list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Step-by-Step Instructions
              </h4>
              <div className="space-y-2.5">
                {activeGuide.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/60"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs leading-relaxed text-zinc-700 flex-1">
                      {st}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip */}
            {activeGuide.proTip && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <strong className="font-semibold">Senior Pro-Tip:</strong>{" "}
                  {activeGuide.proTip}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
          <span>Need direct help? Contact system support</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs font-medium"
          >
            Close Guide
          </Button>
        </div>
      </div>
    </div>
  );
}


