import { ALL_SUPPORTED_CHAIN_IDS } from 'constants/chains'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useIsAmountPopulated, useSwapInfo } from 'lib/hooks/swap'
import useWrapCallback, { WrapType } from 'lib/hooks/swap/useWrapCallback'
import { largeIconCss } from 'lib/icons'
import { Field } from 'lib/state/swap'
import styled, { ThemedText } from 'lib/theme'
import { memo, useMemo } from 'react'
import { TradeState } from 'state/routing/types'

import Row from '../../Row'
import Rule from '../../Rule'
import * as Caption from './Caption'

const ToolbarRow = styled(Row)`
  padding: 0.5em 0;
  ${largeIconCss}
`

export default memo(function Toolbar({ disabled }: { disabled?: boolean }) {
  const { chainId } = useActiveWeb3React()
  const {
    [Field.INPUT]: { currency: inputCurrency, balance },
    [Field.OUTPUT]: { currency: outputCurrency, usdc: outputUSDC },
    trade: { trade, state },
    impact,
  } = useSwapInfo()
  const isRouteLoading = state === TradeState.SYNCING || state === TradeState.LOADING
  const isAmountPopulated = useIsAmountPopulated()
  const { type: wrapType, loading: wrapLoading } = useWrapCallback()
  const caption = useMemo(() => {
    if (disabled) {
      return <Caption.ConnectWallet />
    }

    if (chainId && !ALL_SUPPORTED_CHAIN_IDS.includes(chainId)) {
      return <Caption.UnsupportedNetwork />
    }

    if (inputCurrency && outputCurrency && isAmountPopulated) {
      if (wrapType !== WrapType.NOT_APPLICABLE) {
        return <Caption.WrapCurrency wrapType={wrapType} loading={wrapLoading} />
      }
      if (isRouteLoading) {
        return <Caption.LoadingTrade />
      }
      if (!trade?.swaps) {
        return <Caption.InsufficientLiquidity />
      }
      if (balance && trade?.inputAmount.greaterThan(balance)) {
        return <Caption.InsufficientBalance currency={trade.inputAmount.currency} />
      }
      if (trade.inputAmount && trade.outputAmount) {
        return <Caption.Trade trade={trade} outputUSDC={outputUSDC} impact={impact} />
      }
    }

    return <Caption.Empty />
  }, [
    balance,
    chainId,
    disabled,
    impact,
    inputCurrency,
    isAmountPopulated,
    isRouteLoading,
    outputCurrency,
    outputUSDC,
    trade,
    wrapLoading,
    wrapType,
  ])

  return (
    <>
      <Rule />
      <ThemedText.Caption>
        <ToolbarRow justify="flex-start" gap={0.5} iconSize={4 / 3}>
          {caption}
        </ToolbarRow>
      </ThemedText.Caption>
    </>
  )
})
