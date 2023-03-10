// eslint-disable-next-line no-restricted-imports
import { t, Trans } from '@lingui/macro'
import { BalanceSource, useSortTokensByBalances } from '@muffinfi/state/wallet/hooks'
import { Currency, Token } from '@uniswap/sdk-core'
import { isDisallowedCurrency } from 'constants/tokens'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useToken } from 'hooks/useCurrency'
import useDebounce from 'hooks/useDebounce'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import useTheme from 'hooks/useTheme'
import useToggle from 'hooks/useToggle'
import useNativeCurrency from 'lib/hooks/useNativeCurrency'
import { getTokenFilter } from 'lib/hooks/useTokenList/filtering'
import { useSortTokensByQuery } from 'lib/hooks/useTokenList/sorting'
import { KeyboardEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Edit } from 'react-feather'
import ReactGA from 'react-ga'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'rebass'
import styled from 'styled-components/macro'

import { useAllTokens, useIsUserAddedToken, useSearchInactiveTokenLists } from '../../hooks/Tokens'
import { ButtonText, CloseIcon, IconWrapper, ThemedText } from '../../theme'
import { isAddress } from '../../utils'
import Column from '../Column'
import Row, { RowBetween, RowFixed } from '../Row'
import CommonBases from './CommonBases'
import CurrencyList from './CurrencyList'
import ImportRow from './ImportRow'
import { PaddedColumn, SearchInput, Separator } from './styleds'

const ContentWrapper = styled(Column)`
  width: 100%;
  flex: 1 1;
  position: relative;
`

const Footer = styled.div`
  width: 100%;
  border-radius: 20px;
  padding: 20px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  background-color: var(--layer2);
  border-top: var(--borderColor);
`

interface CurrencySearchProps {
  isOpen: boolean
  onDismiss: () => void
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  otherSelectedCurrency?: Currency | null
  showCommonBases?: boolean
  showCurrencyAmount?: boolean
  disableNonToken?: boolean
  showManageView: () => void
  showImportView: () => void
  setImportToken: (token: Token) => void
  isCurrencySelected?: (iterCurrency: Currency, selectedCurrency: Currency | null | undefined) => boolean
  balanceSource?: BalanceSource
}

export function CurrencySearch({
  selectedCurrency,
  onCurrencySelect,
  otherSelectedCurrency,
  showCommonBases,
  showCurrencyAmount,
  disableNonToken,
  onDismiss,
  isOpen,
  showManageView,
  showImportView,
  setImportToken,
  isCurrencySelected,
  balanceSource,
}: CurrencySearchProps) {
  const { chainId } = useActiveWeb3React()
  const theme = useTheme()

  // refs for fixed size lists
  const fixedList = useRef<FixedSizeList>()

  const [searchQuery, setSearchQuery] = useState<string>('')
  const debouncedQuery = useDebounce(searchQuery, 200)

  const allTokens = useAllTokens()

  // if they input an address, use it
  const isAddressSearch = isAddress(debouncedQuery)

  const searchToken = useToken(debouncedQuery)

  const searchTokenIsAdded = useIsUserAddedToken(searchToken)

  useEffect(() => {
    if (isAddressSearch) {
      ReactGA.event({
        category: 'Currency Select',
        action: 'Search by address',
        label: isAddressSearch,
      })
    }
  }, [isAddressSearch])

  const filteredTokens: Token[] = useMemo(() => {
    return Object.values(allTokens).filter(getTokenFilter(debouncedQuery))
  }, [allTokens, debouncedQuery])

  /**
   * NOTE:
   * Original method explodes your CPU when you are using lists of >1000 tokens.
   * We changed the method, but still should keep track on its performance for now.
   *
   * ```ts
   * // original method
   * const balances = useAllTokenBalances()
   * const sortedTokens: Token[] = useMemo(() => {
   *   return filteredTokens.sort(tokenComparator.bind(null, balances))
   * }, [balances, filteredTokens])
   * ```
   */
  const sortedTokens = useSortTokensByBalances(filteredTokens, balanceSource)

  const filteredSortedTokens = useSortTokensByQuery(debouncedQuery, sortedTokens)

  const native = useNativeCurrency()

  const filteredSortedTokensWithETH: Currency[] = useMemo(() => {
    if (!native) return filteredSortedTokens

    const s = debouncedQuery.toLowerCase().trim()
    if (native.symbol?.toLowerCase()?.indexOf(s) !== -1) {
      return native ? [native, ...filteredSortedTokens] : filteredSortedTokens
    }
    return filteredSortedTokens
  }, [debouncedQuery, native, filteredSortedTokens])

  const tokensShownOnTokenList = useMemo(() => {
    const currencies = disableNonToken ? filteredSortedTokens : filteredSortedTokensWithETH

    // move disallowed currencies to the end
    const allowed: Currency[] = []
    const disallowed: Currency[] = []
    currencies.forEach((currency) => {
      const arr = isDisallowedCurrency(chainId, currency) ? disallowed : allowed
      arr.push(currency)
    })
    return [...allowed, ...disallowed]
  }, [disableNonToken, filteredSortedTokens, filteredSortedTokensWithETH, chainId])

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      onCurrencySelect(currency)
      onDismiss()
    },
    [onDismiss, onCurrencySelect]
  )

  // clear the input on open
  useEffect(() => {
    if (isOpen) setSearchQuery('')
  }, [isOpen])

  // manage focus on modal show
  const inputRef = useRef<HTMLInputElement>()
  const handleInput = useCallback((event) => {
    const input = event.target.value
    const checksummedInput = isAddress(input)
    setSearchQuery(checksummedInput || input)
    fixedList.current?.scrollTo(0)
  }, [])

  const handleEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const s = debouncedQuery.toLowerCase().trim()
        if (s === native?.symbol?.toLowerCase()) {
          handleCurrencySelect(native)
        } else if (filteredSortedTokensWithETH.length > 0) {
          if (
            filteredSortedTokensWithETH[0].symbol?.toLowerCase() === debouncedQuery.trim().toLowerCase() ||
            filteredSortedTokensWithETH.length === 1
          ) {
            handleCurrencySelect(filteredSortedTokensWithETH[0])
          }
        }
      }
    },
    [debouncedQuery, native, filteredSortedTokensWithETH, handleCurrencySelect]
  )

  // menu ui
  const [open, toggle] = useToggle(false)
  const node = useRef<HTMLDivElement>()
  useOnClickOutside(node, open ? toggle : undefined)

  // if no results on main list, show option to expand into inactive
  const filteredInactiveTokens = useSearchInactiveTokenLists(
    filteredTokens.length === 0 || (debouncedQuery.length > 2 && !isAddressSearch) ? debouncedQuery : undefined
  )

  return (
    <ContentWrapper>
      <PaddedColumn gap="16px">
        <RowBetween>
          <Text fontWeight={500} fontSize={16}>
            <Trans>Select a token</Trans>
          </Text>
          <CloseIcon onClick={onDismiss} />
        </RowBetween>
        <Row>
          <SearchInput
            type="text"
            id="token-search-input"
            placeholder={t`Search name or paste address`}
            autoComplete="off"
            value={searchQuery}
            ref={inputRef as RefObject<HTMLInputElement>}
            onChange={handleInput}
            onKeyDown={handleEnter}
          />
        </Row>
        {showCommonBases && (
          <CommonBases
            disableNonToken={disableNonToken}
            chainId={chainId}
            onSelect={handleCurrencySelect}
            selectedCurrency={selectedCurrency}
            isCurrencySelected={isCurrencySelected}
          />
        )}
      </PaddedColumn>
      <Separator />
      {searchToken && !searchTokenIsAdded ? (
        <Column style={{ padding: '20px 0', height: '100%' }}>
          <ImportRow token={searchToken} showImportView={showImportView} setImportToken={setImportToken} />
        </Column>
      ) : tokensShownOnTokenList.length > 0 ? (
        <div style={{ flex: '1' }}>
          <AutoSizer disableWidth>
            {({ height }) => (
              <CurrencyList
                height={height}
                currencies={tokensShownOnTokenList}
                otherListTokens={filteredInactiveTokens}
                onCurrencySelect={handleCurrencySelect}
                otherCurrency={otherSelectedCurrency}
                selectedCurrency={selectedCurrency}
                fixedListRef={fixedList}
                showImportView={showImportView}
                setImportToken={setImportToken}
                showCurrencyAmount={showCurrencyAmount}
                isCurrencySelected={isCurrencySelected}
                balanceSource={balanceSource}
              />
            )}
          </AutoSizer>
        </div>
      ) : (
        <Column style={{ padding: '20px', height: '100%' }}>
          <ThemedText.Main color={theme.text3} textAlign="center" mb="20px">
            <Trans>No results found.</Trans>
          </ThemedText.Main>
        </Column>
      )}
      <Footer>
        <Row justify="center">
          <ButtonText onClick={showManageView} color={theme.primary1} className="list-token-manage-button">
            <RowFixed>
              <IconWrapper size="16px" marginRight="6px" stroke={theme.primaryText1}>
                <Edit />
              </IconWrapper>
              <ThemedText.Main color={theme.primaryText1}>
                <Trans>Manage Token Lists</Trans>
              </ThemedText.Main>
            </RowFixed>
          </ButtonText>
        </Row>
      </Footer>
    </ContentWrapper>
  )
}
