import { Cron } from 'croner';

/**
 * Converts the recurrence arrays to a cron expression.
 * An empty array means "match any" (maps to "*").
 * Format: `0 0 <dayOfMonth> <months> <dayOfWeek>`
 */
export function recurrenceToCron(
    dayOfWeek: number[],
    dayOfMonth: number[],
    months: number[]
): string {
    const dow = dayOfWeek.length ? dayOfWeek.join(',') : '*';
    const dom = dayOfMonth.length ? dayOfMonth.join(',') : '*';
    const mon = months.length ? months.join(',') : '*';
    return `0 0 ${dom} ${mon} ${dow}`;
}

/**
 * Returns the next Date after `from` that satisfies the recurrence fields.
 * Throws if croner cannot find a next run (e.g. impossible combination like dom:31 + months:2).
 */
export function computeNextDue(
    from: Date,
    dayOfWeek: number[],
    dayOfMonth: number[],
    months: number[]
): Date {
    const expr = recurrenceToCron(dayOfWeek, dayOfMonth, months);
    const next = new Cron(expr).nextRun(from);
    if (!next) throw new Error(`No next occurrence found for cron expression: ${expr}`);
    return next;
}
