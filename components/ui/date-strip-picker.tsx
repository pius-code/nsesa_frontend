"use client"

import { useState, useMemo } from "react"
import { Calendar, Clock, ChevronDown, RotateCcw } from "lucide-react"

interface DateStripPickerProps {
  value: string // ISO string or YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
}

export function DateStripPicker({ value, onChange }: DateStripPickerProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  // Current selected date object
  const selectedDate = useMemo(() => {
    return value ? new Date(value) : new Date()
  }, [value])

  // Generate the last 7 days (including today)
  const daysList = useMemo(() => {
    const list = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)

      const dayNum = d.getDate()
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()
      const isToday = i === 0
      const isYesterday = i === 1
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`

      list.push({
        date: d,
        dateKey,
        dayNum,
        dayName,
        isToday,
        isYesterday,
        label: isToday ? "TODAY" : isYesterday ? "YEST" : dayName,
      })
    }
    return list
  }, [])

  const selectedDateKey = useMemo(() => {
    const d = selectedDate
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [selectedDate])

  const isPresetSelected = daysList.some((d) => d.dateKey === selectedDateKey)

  // Format time for display (e.g. 06:25 PM)
  const formattedTime = useMemo(() => {
    return selectedDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }, [selectedDate])

  // Format full date for friendly display
  const friendlyLabel = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const selZero = new Date(selectedDate)
    selZero.setHours(0, 0, 0, 0)

    const diffDays = Math.round((today.getTime() - selZero.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `Today (${selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
    }
    if (diffDays === 1) {
      return `Yesterday (${selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
    }
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [selectedDate])

  // Handler when clicking a day pill
  function handleSelectDay(d: Date) {
    const newDate = new Date(d)
    newDate.setHours(selectedDate.getHours())
    newDate.setMinutes(selectedDate.getMinutes())
    newDate.setSeconds(0)
    newDate.setMilliseconds(0)

    const pad = (n: number) => String(n).padStart(2, "0")
    const localIso = `${newDate.getFullYear()}-${pad(newDate.getMonth() + 1)}-${pad(newDate.getDate())}T${pad(newDate.getHours())}:${pad(newDate.getMinutes())}`
    onChange(localIso)
    setShowCustomPicker(false)
  }

  // Reset to current time
  function handleResetToNow() {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    onChange(localIso)
    setShowCustomPicker(false)
  }

  // Format input value for native datetime-local input
  const rawInputVal = useMemo(() => {
    const d = selectedDate
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }, [selectedDate])

  return (
    <div className="space-y-2">
      {/* Header with selected date summary and Reset button */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-zinc-700 truncate pr-2">
          <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <span className="truncate">
            Date: <strong className="text-zinc-900 font-semibold">{friendlyLabel}</strong> at{" "}
            <strong className="text-zinc-900 font-semibold">{formattedTime}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={handleResetToNow}
          className="flex items-center gap-1 text-green-700 hover:text-green-800 font-medium transition-colors shrink-0"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Now</span>
        </button>
      </div>

      {/* Sleek Horizontal Day Strip (Image 2 style) */}
      <div className="rounded-2xl bg-zinc-100/90 border border-zinc-200/80 p-1.5 shadow-xs">
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
          {daysList.map((item) => {
            const isSelected = item.dateKey === selectedDateKey
            return (
              <button
                key={item.dateKey}
                type="button"
                onClick={() => handleSelectDay(item.date)}
                className={`flex-1 min-w-[42px] sm:min-w-[48px] py-1.5 px-1 flex flex-col items-center justify-center rounded-xl transition-all select-none cursor-pointer ${
                  isSelected
                    ? "bg-zinc-900 text-white shadow-md scale-102 font-semibold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                }`}
              >
                <span
                  className={`text-[9px] sm:text-[10px] tracking-wider font-semibold uppercase leading-tight ${
                    isSelected
                      ? "text-green-400"
                      : item.isToday
                      ? "text-green-600 font-bold"
                      : "text-zinc-400"
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`text-sm sm:text-base leading-tight mt-0.5 font-bold ${
                    isSelected ? "text-white" : "text-zinc-800"
                  }`}
                >
                  {item.dayNum}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom Date & Time Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowCustomPicker((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors py-0.5 cursor-pointer"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {!isPresetSelected
              ? "Using Custom Date / Time (click to change)"
              : "Pick specific time or older date"}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showCustomPicker ? "rotate-180" : ""}`}
          />
        </button>

        {showCustomPicker && (
          <div className="mt-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <input
                type="datetime-local"
                value={rawInputVal}
                onChange={(e) => {
                  if (e.target.value) onChange(e.target.value)
                }}
                className="flex-1 h-9 px-3 rounded-lg border border-zinc-300 bg-white text-xs font-medium text-zinc-800 shadow-xs focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
              />
              <button
                type="button"
                onClick={() => setShowCustomPicker(false)}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Done
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Use this if the transaction was made at an exact time or further back in time.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
