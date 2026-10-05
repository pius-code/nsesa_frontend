/**
 * Shared Password Utility for Nsesa Platform
 * Enforces:
 * - At least 8 characters
 * - Alphanumeric (letters and numbers)
 * - Contains a special character/symbol
 */

export const PASSWORD_RULES = {
  minLength: 8,
  description: "Must be at least 8 characters, alphanumeric, and contain a symbol (e.g. !@#$%^&*)",
}

export function validatePassword(password: string) {
  const minLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>\-_=+[\];/]/.test(password)

  const isValid = minLength && hasLetter && hasNumber && hasSymbol
  const errors: string[] = []

  if (!minLength) errors.push("At least 8 characters")
  if (!hasLetter) errors.push("At least one letter")
  if (!hasNumber) errors.push("At least one number")
  if (!hasSymbol) errors.push("At least one symbol (!@#$%^&*)")

  return {
    isValid,
    errors,
    checks: {
      minLength,
      hasLetter,
      hasNumber,
      hasSymbol,
    },
  }
}

export function generateStrongPassword(length = 10): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ" // exclude ambiguous I, O
  const lower = "abcdefghjkmnpqrstuvwxyz" // exclude ambiguous l, o
  const numbers = "23456789" // exclude ambiguous 0, 1
  const symbols = "!@#$%^&*()-_=+"

  const all = upper + lower + numbers + symbols

  // Ensure at least one of each category
  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]

  // Fill remaining characters
  for (let i = chars.length; i < length; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)])
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = chars[i]
    chars[i] = chars[j]
    chars[j] = temp
  }

  return chars.join("")
}
