export const MAX_ASKS: number;
export const COOLDOWN_DAYS: number;
export const MIN_COMPLETED_DAYS: number;

type CompletedLike = { status?: string; completedAt?: number | null };

export function completedDays(tasks: CompletedLike[] | null | undefined): number;

export function shouldAskReview(o: {
  tasks: CompletedLike[] | null | undefined;
  justCompleted: boolean;
  today: string;
  reviewAsks?: string[];
}): boolean;

export function recordAsk(reviewAsks: string[] | null | undefined, today: string): string[];
