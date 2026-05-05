import {startOfDay, endOfDay, subDays, subYears} from "date-fns"
import { and, gte, lte, type SQL } from "drizzle-orm"

export type DateRange = "7d" | "30d" | "90d" | "1y" | "all"

export function DateFilter(column: any,range?: DateRange, from?: string, to?: string):SQL | undefined {
    const now = new Date()

    if (from) {
        const fromDate = new Date(from)
        let endDate;
        if (to) {
            const end = new Date(to)
            end.setHours(23, 59, 59)
            endDate = end
        }

        return and(
            gte(column, startOfDay(fromDate)),
            lte(column, endOfDay(endDate ?? now))
        )
    }

    if (range && range !== "all") {
        let fromDate: Date;
        switch(range) {
            case "7d": 
                fromDate = subDays(now, 6)
                break;
            case "30d":
                fromDate = subDays(now, 29)
                break;
            case "90d":
                fromDate = subDays(now, 89)
                break;
            case "1y":
                fromDate = subYears(now, 1)
                break;
            default:
                return undefined
        }

        return and(
            gte(column, startOfDay(fromDate)),
            lte(column, endOfDay(now))
        )
    }

    return undefined
}