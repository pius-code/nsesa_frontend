"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Minus, Plus, Trash2, Loader2, ShoppingCart, Search, X, UserPlus, Check } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InventoryItem {
  _id: string
  product_name: string
  product_price: number
  amount_available: number
  is_available: boolean
  category_name: string | null
}

interface CartItem {
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
}

interface Client {
  id: string
  client_name: string
  client_phone: string | null
  client_email: string | null
}

function useInventory() {
  return useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/inventory/get_my_shop_inventory")
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])
  return debounced
}

function useClientSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  return useQuery<Client[]>({
    queryKey: ["clients-search", debouncedQuery],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/clients", { params: { q: debouncedQuery, limit: 8 } })
      return data
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 60 * 1000,
  })
}

export function TransactionForm({ workerName, workerId }: { workerName: string; workerId?: string }) {
  const queryClient = useQueryClient()
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory()

  const [selectedProductId, setSelectedProductId] = useState("")
  const [qty, setQty] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])

  // TODO: For shops with >100 products, move product search to server-side (API endpoint with q= param)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [customerName, setCustomerName] = useState("")
  const [customerNumber, setCustomerNumber] = useState("")
  const [sendSms, setSendSms] = useState(true)
  const [paymentMode, setPaymentMode] = useState<"cash" | "momo" | "card">("cash")

  const [clientId, setClientId] = useState<string | null>(null)
  const [clientQuery, setClientQuery] = useState("")
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientPhone, setNewClientPhone] = useState("")
  const { data: clientResults = [], isFetching: clientSearching } = useClientSearch(clientQuery)

  function selectClient(client: Client) {
    setClientId(client.id)
    setClientQuery(client.client_name)
    setCustomerName(client.client_name)
    setCustomerNumber(client.client_phone ?? "")
    setClientSearchOpen(false)
  }

  function clearClient() {
    setClientId(null)
    setClientQuery("")
  }

  const createClientMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/clients", {
        client_name: newClientName.trim(),
        client_phone: newClientPhone.trim() || null,
      })
      return data as Client
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["clients-search"] })
      selectClient(client)
      setShowNewClientForm(false)
      setNewClientName("")
      setNewClientPhone("")
      toast.success("Client registered")
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? "Failed to register client")
    },
  })


  const availableProducts = inventory.filter((p) => p.is_available)

  // TODO: For shops with >100 products, move product search to server-side (API endpoint with q= param)
  const filteredProducts = searchQuery.trim()
    ? availableProducts.filter((p) =>
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableProducts

  const selectedProduct = availableProducts.find((p) => p._id === selectedProductId)

  const maxQty = selectedProduct
    ? selectedProduct.amount_available - (cart.find((c) => c.product_id === selectedProduct._id)?.quantity ?? 0)
    : Infinity

  function selectProduct(product: InventoryItem) {
    setSelectedProductId(product._id)
    setSearchQuery(product.product_name)
    setSearchOpen(false)
    setQty(1)
  }

  function clearProduct() {
    setSelectedProductId("")
    setSearchQuery("")
    setQty(1)
  }

  function incrementQty() {
    setQty((q) => (selectedProduct ? Math.min(q + 1, maxQty) : q + 1))
  }

  function decrementQty() {
    setQty((q) => Math.max(1, q - 1))
  }

  function addItem() {
    if (!selectedProduct || qty < 1) return
    const inCart = cart.find((c) => c.product_id === selectedProduct._id)?.quantity ?? 0
    if (inCart + qty > selectedProduct.amount_available) return
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === selectedProduct._id)
      if (existing) {
        const newQty = existing.quantity + qty
        return prev.map((c) =>
          c.product_id === selectedProduct._id
            ? { ...c, quantity: newQty, subtotal: newQty * c.unit_price }
            : c
        )
      }
      return [
        ...prev,
        {
          product_id: selectedProduct._id,
          product_name: selectedProduct.product_name,
          unit_price: selectedProduct.product_price,
          quantity: qty,
          subtotal: qty * selectedProduct.product_price,
        },
      ]
    })
    clearProduct()
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== productId))
  }

  const total = cart.reduce((sum, c) => sum + c.subtotal, 0)

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/v1/create-transaction", {
        customer_name: customerName.trim() || "customer",
        customer_number: customerNumber.trim() || null,
        client_id: clientId,
        items: cart,
        total_price: total,
        payment_mode: paymentMode,
        processed_by: workerName,
        processed_by_id: workerId ?? null,
        send_sms: sendSms,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      toast.success("Transaction recorded successfully!")
      setCart([])
      setCustomerName("")
      setCustomerNumber("")
      clearClient()
      clearProduct()
    },
    onError: (err: unknown) => {
      // Re-fetch inventory so the worker sees current stock (e.g. another worker just sold the last units)
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? "Failed to submit. Please try again.")
    },
  })

  const canSubmit = cart.length > 0 && !mutation.isPending

  return (
    <div className="mx-auto max-w-xl w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">New Transaction</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Fill in customer details and add products</p>
      </div>


      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) mutation.mutate()
        }}
        className="bg-white rounded-2xl border border-zinc-200 shadow-sm divide-y divide-zinc-100"
      >
        {/* Customer details */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-700">Customer Details</p>

          {/* Registered client search */}
          <div className="space-y-1.5">
            <Label>Registered Client</Label>
            {clientId ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-green-800 flex-1 truncate">{clientQuery}</span>
                <button type="button" onClick={clearClient} className="text-green-600 hover:text-green-800 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input
                  placeholder="Search by name or phone…"
                  value={clientQuery}
                  onChange={(e) => {
                    setClientQuery(e.target.value)
                    setClientSearchOpen(true)
                  }}
                  onFocus={() => setClientSearchOpen(true)}
                  onBlur={() => setTimeout(() => setClientSearchOpen(false), 150)}
                  className="pl-9"
                />
                {clientSearchOpen && clientQuery.trim() && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {clientSearching ? (
                      <p className="px-3 py-2.5 text-sm text-zinc-400 flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Searching…
                      </p>
                    ) : clientResults.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-zinc-400">No matching clients</p>
                    ) : (
                      clientResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectClient(c)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-zinc-50 transition-colors text-left"
                        >
                          <span className="font-medium text-zinc-800">{c.client_name}</span>
                          {c.client_phone && <span className="text-zinc-500 text-xs shrink-0 ml-2">{c.client_phone}</span>}
                        </button>
                      ))
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setNewClientName(clientQuery)
                        setShowNewClientForm(true)
                        setClientSearchOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors text-left border-t border-zinc-100"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Register &quot;{clientQuery}&quot; as a new client
                    </button>
                  </div>
                )}
              </div>
            )}

            {showNewClientForm && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 space-y-2.5">
                <Input
                  placeholder="Client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  autoFocus
                />
                <Input
                  placeholder="Phone (optional)"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewClientForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => createClientMutation.mutate()}
                    disabled={createClientMutation.isPending || newClientName.trim() === ""}
                    className="flex-1"
                  >
                    {createClientMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Client"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="customer_name">Name</Label>
              <Input
                id="customer_name"
                placeholder="Optional"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_number">Phone</Label>
              <Input
                id="customer_number"
                placeholder="0XX XXX XXXX"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              {(["cash", "momo", "card"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    paymentMode === mode
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {mode === "momo" ? "MoMo" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={sendSms}
              onChange={(e) => setSendSms(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-green-600 cursor-pointer"
            />
            <span className="text-sm text-zinc-700">Send SMS confirmation to customer</span>
          </label>
        </div>

        {/* Product picker */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">Add Products</p>

          {/* Search / autocomplete */}
          <div ref={searchRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <Input
              placeholder={inventoryLoading ? "Loading products…" : "Search products…"}
              value={searchQuery}
              disabled={inventoryLoading}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedProductId("")
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearProduct}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Results dropdown */}
            {searchOpen && !inventoryLoading && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="px-3 py-2.5 text-sm text-zinc-400">No products found</p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectProduct(p)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-zinc-50 transition-colors text-left"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-zinc-800 truncate">{p.product_name}</span>
                        {p.category_name && (
                          <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                            {p.category_name}
                          </span>
                        )}
                      </span>
                      <span className="text-zinc-500 text-xs shrink-0 ml-2">
                        GH₵{p.product_price.toFixed(2)} · {p.amount_available} in stock
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected product chip */}
          {selectedProduct && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
              <span className="flex-1 flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium text-green-800 truncate">
                  {selectedProduct.product_name}
                </span>
                {selectedProduct.category_name && (
                  <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                    {selectedProduct.category_name}
                  </span>
                )}
              </span>
              <span className="text-xs text-green-600 shrink-0">
                GH₵{selectedProduct.product_price.toFixed(2)}
              </span>
            </div>
          )}

          {/* Stock hint */}
          {selectedProduct && (() => {
            const inCart = cart.find((c) => c.product_id === selectedProduct._id)?.quantity ?? 0
            const remaining = selectedProduct.amount_available - inCart
            const overLimit = qty > remaining
            return (
              <p className={`text-xs ${overLimit ? "text-red-500 font-medium" : "text-zinc-500"}`}>
                {overLimit
                  ? `Only ${remaining} available (${inCart} already in cart)`
                  : `${selectedProduct.amount_available} in stock · subtotal: `}
                {!overLimit && (
                  <span className="font-semibold text-green-600">
                    GH₵{(selectedProduct.product_price * qty).toFixed(2)}
                  </span>
                )}
              </p>
            )
          })()}

          {/* Quantity controls + Add to cart */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={decrementQty}
                disabled={qty <= 1}
                className="px-3 py-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold text-zinc-800 select-none">
                {qty}
              </span>
              <button
                type="button"
                onClick={incrementQty}
                disabled={selectedProduct ? qty >= maxQty : false}
                className="px-3 py-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              type="button"
              onClick={addItem}
              disabled={!selectedProductId}
              className="flex-1 gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs sm:text-sm">To cart</span>
            </Button>
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="px-5 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                Order Items
              </p>
              <span className="text-xs text-zinc-400">{cart.length} line(s)</span>
            </div>

            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      GH₵{item.unit_price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-800 shrink-0">
                    GH₵{item.subtotal.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id)}
                    className="text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold text-zinc-700">Total</span>
              <span className="text-xl font-bold text-green-600">
                GH₵{total.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="px-5 py-4">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              `Record Transaction${cart.length > 0 ? ` · GH₵${total.toFixed(2)}` : ""}`
            )}
          </Button>
          {cart.length === 0 && (
            <p className="text-xs text-center text-zinc-400 mt-2">Add at least one product to continue</p>
          )}
        </div>
      </form>
    </div>
  )
}
