import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { TicketType, Event } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

// Cart item interface based on approved architecture
export interface CartItem {
  id: string // Unique cart item ID
  ticketTypeId: string
  eventId: string
  quantity: number
  price: number
  title: string
  description?: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventLocation?: string // Optional location field
  earlyBirdPrice?: number
  earlyBirdUntil?: string
  maxPerPerson: number
}

// Cart state interface
export interface CartState {
  items: CartItem[]
  totalItems: number
  subtotal: number
  fees: number
  total: number
  isLoading: boolean
  isCartOpen: boolean
}

// Cart actions for useReducer
export type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'HYDRATE_CART'; payload: CartItem[] }
  | { type: 'SET_CART_OPEN'; payload: boolean }

// Cart context interface
interface CartContextType extends CartState {
  addItem: (ticketType: TicketType, event: Event, quantity: number) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (ticketTypeId: string) => number
  isInCart: (ticketTypeId: string) => boolean
  setIsCartOpen: (open: boolean) => void
}

// Fee calculation configuration (3% processing fee as per existing checkout)
const FEE_RATE = 0.03

// Calculate cart totals
const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => {
    const effectivePrice = getCurrentPrice(item)
    return sum + (effectivePrice * item.quantity)
  }, 0)
  const fees = subtotal * FEE_RATE
  const total = subtotal + fees
  
  return { totalItems, subtotal, fees, total }
}

// Get current effective price (early bird or regular)
const getCurrentPrice = (item: CartItem): number => {
  if (item.earlyBirdPrice && item.earlyBirdUntil) {
    const now = new Date()
    const earlyBirdEnd = new Date(item.earlyBirdUntil)
    return now <= earlyBirdEnd ? item.earlyBirdPrice : item.price
  }
  return item.price
}

// Cart reducer following existing patterns
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item.ticketTypeId === action.payload.ticketTypeId && 
                 item.eventId === action.payload.eventId
      )
      
      let newItems: CartItem[]
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: Math.min(item.quantity + action.payload.quantity, item.maxPerPerson) }
            : item
        )
      } else {
        // Add new item
        newItems = [...state.items, action.payload]
      }
      
      const totals = calculateTotals(newItems)
      
      return {
        ...state,
        items: newItems,
        ...totals,
        isCartOpen: true // Open cart when item is added
      }
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.id)
      const totals = calculateTotals(newItems)
      
      return {
        ...state,
        items: newItems,
        ...totals
      }
    }
    
    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: Math.max(1, Math.min(action.payload.quantity, item.maxPerPerson)) }
          : item
      )
      const totals = calculateTotals(newItems)
      
      return {
        ...state,
        items: newItems,
        ...totals
      }
    }
    
    case 'CLEAR_CART': {
      return {
        ...state,
        items: [],
        totalItems: 0,
        subtotal: 0,
        fees: 0,
        total: 0
      }
    }
    
    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload
      }
    }
    
    case 'HYDRATE_CART': {
      const totals = calculateTotals(action.payload)
      return {
        ...state,
        items: action.payload,
        ...totals,
        isLoading: false
      }
    }
    
    case 'SET_CART_OPEN': {
      return {
        ...state,
        isCartOpen: action.payload
      }
    }
    
    default:
      return state
  }
}

// Initial cart state
const initialState: CartState = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  fees: 0,
  total: 0,
  isLoading: true,
  isCartOpen: false
}

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined)

// Cart hook following existing pattern
export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

// Cart provider props
interface CartProviderProps {
  children: ReactNode
}

// Cart provider component
export const CartProvider = ({ children }: CartProviderProps) => {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { user } = useAuth()

  // localStorage key - now user-specific when logged in
  const getCartStorageKey = () => {
    return user ? `stepper-cart-items-${user.id}` : 'stepper-cart-items-anon'
  }
  
  // Key for anonymous cart that might need merging
  const ANON_CART_KEY = 'stepper-cart-items-anon'

  // Hydrate cart from localStorage on mount and when user changes
  useEffect(() => {
    try {
      const currentCartKey = getCartStorageKey()
      const savedCart = localStorage.getItem(currentCartKey)
      
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart) as CartItem[]
        dispatch({ type: 'HYDRATE_CART', payload: parsedCart })
      } else if (user && currentCartKey !== ANON_CART_KEY) {
        // User just logged in - check for anonymous cart to merge
        const anonCart = localStorage.getItem(ANON_CART_KEY)
        if (anonCart) {
          const parsedAnonCart = JSON.parse(anonCart) as CartItem[]
          dispatch({ type: 'HYDRATE_CART', payload: parsedAnonCart })
          // Clean up anonymous cart after merging
          localStorage.removeItem(ANON_CART_KEY)
        } else {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [user])

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    if (!state.isLoading) {
      try {
        const currentCartKey = getCartStorageKey()
        localStorage.setItem(currentCartKey, JSON.stringify(state.items))
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error)
      }
    }
  }, [state.items, state.isLoading, user])

  // Add item to cart
  const addItem = (ticketType: TicketType, event: Event, quantity: number) => {
    const cartItem: CartItem = {
      id: `${ticketType.id}-${Date.now()}`, // Unique ID for cart item
      ticketTypeId: ticketType.id,
      eventId: event.id,
      quantity: Math.min(quantity, ticketType.max_per_person),
      price: ticketType.price,
      title: ticketType.name,
      description: ticketType.description || undefined,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      earlyBirdPrice: ticketType.early_bird_price || undefined,
      earlyBirdUntil: ticketType.early_bird_until || undefined,
      maxPerPerson: ticketType.max_per_person
    }
    
    dispatch({ type: 'ADD_ITEM', payload: cartItem })
  }

  // Remove item from cart
  const removeItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id: itemId } })
  }

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } })
    }
  }

  // Clear entire cart
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  // Get quantity of specific ticket type in cart
  const getItemQuantity = (ticketTypeId: string): number => {
    return state.items
      .filter(item => item.ticketTypeId === ticketTypeId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  // Check if ticket type is in cart
  const isInCart = (ticketTypeId: string): boolean => {
    return state.items.some(item => item.ticketTypeId === ticketTypeId)
  }

  // Set cart open state
  const setIsCartOpen = (open: boolean) => {
    dispatch({ type: 'SET_CART_OPEN', payload: open })
  }

  const value: CartContextType = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    isInCart,
    setIsCartOpen
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}