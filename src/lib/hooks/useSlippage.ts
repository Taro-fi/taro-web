import { InterfaceTrade } from '@muffinfi/state/routing/types'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import useAutoSlippageTolerance from 'hooks/useAutoSlippageTolerance'
import { useAtomValue } from 'jotai/utils'
import { autoSlippageAtom, maxSlippageAtom } from 'lib/state/settings'
import { useMemo } from 'react'

export function toPercent(maxSlippage: number | undefined): Percent | undefined {
  if (!maxSlippage) return undefined
  const numerator = Math.floor(maxSlippage * 100)
  return new Percent(numerator, 10_000)
}

export interface Slippage {
  auto: boolean
  allowed: Percent
  warning?: 'warning' | 'error'
}

/** Returns the allowed slippage, and whether it is auto-slippage. */
export default function useSlippage(trade: InterfaceTrade<Currency, Currency, TradeType> | undefined): Slippage {
  const shouldUseAutoSlippage = useAtomValue(autoSlippageAtom)
  const autoSlippage = useAutoSlippageTolerance(shouldUseAutoSlippage ? trade : undefined)
  const maxSlippageValue = useAtomValue(maxSlippageAtom)
  const maxSlippage = useMemo(() => toPercent(maxSlippageValue), [maxSlippageValue])
  return useMemo(() => {
    const auto = shouldUseAutoSlippage || !maxSlippage
    const allowed = shouldUseAutoSlippage ? autoSlippage : maxSlippage ?? autoSlippage
    const warning = auto ? undefined : getSlippageWarning(allowed)
    return { auto, allowed, warning }
  }, [autoSlippage, maxSlippage, shouldUseAutoSlippage])
}

export const MAX_VALID_SLIPPAGE = new Percent(1, 2)
export const MIN_HIGH_SLIPPAGE = new Percent(1, 100)

export function getSlippageWarning(slippage?: Percent): 'warning' | 'error' | undefined {
  if (slippage?.greaterThan(MAX_VALID_SLIPPAGE)) return 'error'
  if (slippage?.greaterThan(MIN_HIGH_SLIPPAGE)) return 'warning'
  return
}
