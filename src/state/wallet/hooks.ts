import { BalanceSource } from '@muffinfi/state/wallet/hooks'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import JSBI from 'jsbi'
import { useTokenBalance, useTokenBalances } from 'lib/hooks/useCurrencyBalance'
import { useMemo } from 'react'

import { UNI } from '../../constants/tokens'
import { useAllTokens } from '../../hooks/Tokens'
import { useUserUnclaimedAmount } from '../claim/hooks'
import { useTotalUniEarned } from '../stake/hooks'

export {
  default as useCurrencyBalance,
  useCurrencyBalances,
  useNativeCurrencyBalances,
  useTokenBalance,
  useTokenBalances,
  useTokenBalancesWithLoadingIndicator,
} from 'lib/hooks/useCurrencyBalance'

// mimics useAllBalances
/**
 * NOTE: Be careful to use!
 * CPU usage explodes when users are using token lists of >1000 tokens
 */
export function useAllTokenBalances(source?: BalanceSource): {
  [tokenAddress: string]: CurrencyAmount<Token> | undefined
} {
  const { account } = useActiveWeb3React()
  const allTokens = useAllTokens()
  const allTokensArray = useMemo(() => Object.values(allTokens ?? {}), [allTokens])
  const balances = useTokenBalances(account ?? undefined, allTokensArray, source)
  return balances ?? {}
}

// get the total owned, unclaimed, and unharvested UNI for account
export function useAggregateUniBalance(source?: BalanceSource): CurrencyAmount<Token> | undefined {
  const { account, chainId } = useActiveWeb3React()

  const uni = chainId ? UNI[chainId] : undefined

  const uniBalance: CurrencyAmount<Token> | undefined = useTokenBalance(account ?? undefined, uni, source)
  const uniUnclaimed: CurrencyAmount<Token> | undefined = useUserUnclaimedAmount(account)
  const uniUnHarvested: CurrencyAmount<Token> | undefined = useTotalUniEarned()

  if (!uni) return undefined

  return CurrencyAmount.fromRawAmount(
    uni,
    JSBI.add(
      JSBI.add(uniBalance?.quotient ?? JSBI.BigInt(0), uniUnclaimed?.quotient ?? JSBI.BigInt(0)),
      uniUnHarvested?.quotient ?? JSBI.BigInt(0)
    )
  )
}
