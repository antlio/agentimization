import { useEffect, type EffectCallback } from "react"

// sanctioned wrapper for one-time mount sync e.g timers, subscriptions,
// external lifecycles
export const useMountEffect = (effect: EffectCallback) => {
  useEffect(effect, [])
}
