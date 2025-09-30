import PreviousRouteBtn from '@components/PreviousRouteBtn'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { AssetAccount } from '@utils/uiTypes/assets'
import { useCallback, useEffect, useState } from 'react'
import GovernedAccountSelect from '../../proposal/components/GovernedAccountSelect'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import Loading from '@components/Loading'
import Button from '@components/Button'
import TokenBox from '@components/Orders/TokenBox'
import tokenPriceService from '@utils/services/tokenPrice'
import {
  toNative,
  toUiDecimals,
  USDC_MINT,
} from '@blockworks-foundation/mango-v4'
import { TokenInfo } from '@utils/services/types'
import Input from '@components/inputs/Input'
import Modal from '@components/Modal'
import TokenSearchBox from '@components/Orders/TokenSearchBox'
import {
  FEE_WALLET,
  fetchLastPriceForMints,
  getTokenLabels,
  MANIFEST_PROGRAM_ID,
  SideMode,
  tryGetNumber,
} from '@utils/orders'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import { Market, UiWrapper } from '@cks-systems/manifest-sdk'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { isBid, WRAPPED_SOL_MINT } from '@metaplex-foundation/js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token-new'
import {
  getInstructionDataFromBase64,
  serializeInstructionToBase64,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-governance'
import useCreateProposal from '@hooks/useCreateProposal'
import { InstructionDataWithHoldUpTime } from 'actions/createProposal'
import { notify } from '@utils/notifications'
import { useRouter } from 'next/router'
import useQueryContext from '@hooks/useQueryContext'
import { useVoteByCouncilToggle } from '@hooks/useVoteByCouncilToggle'
import { UiOpenOrder, useOpenOrders } from '@hooks/useOpenOrders'
import { useQuery } from '@tanstack/react-query'
import { useSortableData } from '@hooks/useSortableData'
import { getVaultAddress } from '@cks-systems/manifest-sdk/dist/cjs/utils'
import { useUnsettledBalances } from '@hooks/useUnsettledBalances'
import { abbreviateAddress } from '@utils/formatting'
import {
  CheckIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from '@heroicons/react/solid'
import {
  createCancelOrderInstruction,
  createSettleFundsInstruction,
} from '@cks-systems/manifest-sdk/dist/cjs/ui_wrapper/instructions'
import VoteBySwitch from '../../proposal/components/VoteBySwitch'
import { ArrowsUpDownIcon } from '@heroicons/react-v2/20/solid'
import { getJupiterPricesByMintStrings } from '@hooks/queries/jupiterPrice'
import { WSOL_MINT_PK } from '@components/instructions/tools'
import { Description } from '@radix-ui/react-dialog'
import DescriptionBox from '@components/Orders/DescriptionBox'
import { Table, Td, Th, TrBody, TrHead } from '@components/TableElements'

export default function Orders() {
  const { fmtUrlWithCluster } = useQueryContext()
  const { governedTokenAccounts } = useGovernanceAssets()
  const { handleCreateProposal } = useCreateProposal()
  const [selectedSolWallet, setSelectedSolWallet] =
    useState<AssetAccount | null>(null)
  const [cancelId] = useState<number | null>(null)
  const connection = useLegacyConnectionContext()
  const router = useRouter()
  const { voteByCouncil, shouldShowVoteByCouncilToggle, setVoteByCouncil } =
    useVoteByCouncilToggle()

  const [showCustomTitleModal, setShowCustomTitleModal] = useState(false)
  const [initialTitle, setInitialTitle] = useState('')

  const [currentTitleCallback, setCurrentTitleCallback] = useState<
    ((title: string, description: string) => void) | null
  >(null)

  const wallet = useWalletOnePointOh()
  const connected = !!wallet?.connected

  const tokens = tokenPriceService._tokenList
  const usdcToken =
    tokens.find((x) => x.address === USDC_MINT.toBase58()) || null
  const wsolToken =
    tokens.find((x) => x.address === WSOL_MINT_PK.toBase58()) || null

  const { openOrders, loadingOpenOrders } = useOpenOrders(
    selectedSolWallet?.extensions.transferAddress,
  )
  const { unsettledBalances, loadingUnsettledBalances } = useUnsettledBalances(
    selectedSolWallet?.extensions.transferAddress,
  )

  const [sellToken, setSellToken] = useState<null | AssetAccount>(null)
  const [sellAmount, setSellAmount] = useState('0')
  const [price, setPrice] = useState('0')
  const [buyToken, setBuyToken] = useState<null | TokenInfo>(null)
  const [buyAmount, setBuyAmount] = useState('0')
  const [sideMode, setSideMode] = useState<SideMode>('Sell')
  const [isTokenSearchOpen, setIsTokenSearchOpen] = useState(false)

  const { symbol, img, uiAmount } = getTokenLabels(sellToken)

  const loading = false

  useEffect(() => {
    if (!buyToken && usdcToken) {
      setBuyToken(usdcToken)
    }
  }, [buyAmount, buyToken, usdcToken])

  useEffect(() => {
    if (sellToken?.extensions.mint?.publicKey) {
      const price = tokenPriceService.getUSDTokenPrice(
        sellToken?.extensions.mint?.publicKey.toBase58(),
      )
      setPrice(price.toString())
    }
  }, [sellToken?.extensions.mint])

  useEffect(() => {
    const getPrice = async (buyToken: TokenInfo) => {
      const resp = await getJupiterPricesByMintStrings([buyToken.address])

      setPrice(resp[buyToken.address].price.toString())
    }
    if (buyToken?.address) {
      getPrice(buyToken)
    }
  }, [buyToken])

  useEffect(() => {
    if (tryGetNumber(sellAmount) && tryGetNumber(price)) {
      if (sideMode === 'Sell') {
        setBuyAmount((Number(sellAmount) * Number(price)).toString())
      } else if (sideMode === 'Buy') {
        setBuyAmount((Number(sellAmount) / Number(price)).toString())
      }
    }
  }, [sellAmount, price])

  useEffect(() => {
    if (
      governedTokenAccounts.filter((x) => x.isSol)?.length &&
      !selectedSolWallet
    ) {
      setSelectedSolWallet(governedTokenAccounts.filter((x) => x.isSol)[0])
    }
  }, [governedTokenAccounts, selectedSolWallet])

  useEffect(() => {
    setSellToken(null)
    setSellAmount('0')
    setPrice('0')
    setBuyToken(usdcToken)
    setBuyAmount('0')
    setSideMode('Sell')
  }, [selectedSolWallet])

  const formattedTableData = async () => {
    if (!openOrders?.length) return []
    const data: any = []

    // Collect all quote mints first
    const quoteMints = openOrders.map((order) => order.quoteMint.toBase58())
    // Fetch prices for all quote mints in one call
    const quotePrices = await fetchLastPriceForMints(quoteMints)

    for (let i = 0; i < openOrders.length; i++) {
      const order = openOrders[i]
      const {
        baseMint,
        quoteMint,
        tokenPrice: price,
        isBid,
        market,
        clientOrderId: orderId,
      } = order

      let size = order.numBaseAtoms
      const side = isBid ? 'buy' : 'sell'
      let baseSymbol = ''
      let baseImageUrl = ''
      let baseName = ''
      let quoteSymbol = ''
      let quoteImageUrl = ''
      let quoteName = ''
      let baseProgram = TOKEN_PROGRAM_ID.toBase58()
      let quoteProgram = TOKEN_PROGRAM_ID.toBase58()

      // const lastPriceQuote =
      //   quoteMint.toBase58() === USDC_MINT
      //     ? 1
      //     : quotePrices.find((p) => p.mint === quoteMint.toBase58())?.price ||
      //       null

      const lastPriceQuote =
        quotePrices.find((p) => p.mint === quoteMint.toBase58())?.price || null

      if (
        tokenPriceService._tokenList &&
        tokenPriceService._tokenList?.length
      ) {
        const baseOrderMetaData = tokenPriceService._tokenList.find(
          (meta) => meta.address === baseMint.toBase58(),
        )
        const quoteOrderMetaData = tokenPriceService._tokenList.find(
          (meta) => meta.address === quoteMint.toBase58(),
        )
        if (baseOrderMetaData) {
          baseSymbol = baseOrderMetaData?.symbol
          baseImageUrl = baseOrderMetaData?.logoURI || ''
          baseProgram = TOKEN_PROGRAM_ID.toBase58()
          baseName = baseOrderMetaData?.name
        }
        if (quoteOrderMetaData) {
          quoteSymbol = quoteOrderMetaData?.symbol
          quoteImageUrl = quoteOrderMetaData?.logoURI || ''
          quoteProgram = TOKEN_PROGRAM_ID.toBase58()
          quoteName = quoteOrderMetaData?.name
        }

        size = toUiDecimals(
          Number(size.toString()),
          baseOrderMetaData?.decimals ?? 0,
        )
      }

      const quoteValue = price * Number(size)
      const usdValue = lastPriceQuote ? quoteValue * lastPriceQuote : null
      const formattedOrder = {
        marketName: `${baseSymbol}/${quoteSymbol}`,
        baseImageUrl,
        baseSymbol,
        baseName,
        quoteImageUrl,
        quoteSymbol,
        quoteName,
        order,
        orderId,
        price,
        side,
        size,
        baseMint,
        market,
        quoteMint,
        isBid,
        value: quoteValue,
        baseProgram,
        quoteProgram,
        usdValue,
      }
      data.push(formattedOrder)
    }
    return data
  }

  const unselttedFormattedTableData = useCallback(() => {
    if (!unsettledBalances?.length) return []
    const data: any = []
    for (let i = 0; i < unsettledBalances.length; i++) {
      const u = unsettledBalances[i]
      const abbreviateBaseMint = abbreviateAddress(u.market.baseMint())
      const abbreviateQuoteMint = abbreviateAddress(u.market.quoteMint())
      if (!u.numBaseTokens && !u.numQuoteTokens) continue

      if (
        tokenPriceService._tokenList &&
        tokenPriceService._tokenList?.length
      ) {
        const quoteMeta = tokenPriceService._tokenList.find(
          (meta) => meta.address === u.market.quoteMint().toBase58(),
        )
        const baseMeta = tokenPriceService._tokenList.find(
          (meta) => meta.address === u.market.baseMint().toBase58(),
        )

        const formattedUnsettled = {
          marketName: `${baseMeta?.symbol || abbreviateBaseMint}/${
            quoteMeta?.symbol || abbreviateQuoteMint
          }`,
          marketAddress: u.market.address.toBase58(),
          baseSymbol: baseMeta?.symbol || abbreviateBaseMint,
          quoteSymbol: quoteMeta?.symbol || abbreviateQuoteMint,
          imageUrl: baseMeta?.logoURI || '',
          market: u.market,
          uiAmountBase: u.numBaseTokens,
          uiAmountQuote: u.numQuoteTokens,
          baseProgram: TOKEN_PROGRAM_ID.toBase58(),
          quoteProgram: TOKEN_PROGRAM_ID.toBase58(),
        }
        data.push(formattedUnsettled)
      }
    }
    return data
  }, [unsettledBalances])

  const { data: formattedOrders, isLoading: loadingFormattedOrders } = useQuery(
    ['formatted-orders', openOrders?.length],
    () => formattedTableData(),
    {
      cacheTime: 1000 * 60 * 30,
      staleTime: 1000 * 60 * 30,
      refetchInterval: 5000,
      retry: 3,
      refetchOnWindowFocus: false,
      enabled: !!openOrders?.length,
    },
  )

  const {
    items: tableData,
    requestSort,
    sortConfig,
  } = useSortableData(formattedOrders || [])

  const settle = async (
    title: string,
    description: string,
    unsettledMarket: string,
  ) => {
    const ixes: (
      | string
      | {
          serializedInstruction: string
          holdUpTime: number
        }
    )[] = []
    const signers: Keypair[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []
    if (selectedSolWallet && wallet?.publicKey) {
      const owner = selectedSolWallet.extensions.transferAddress!

      const [wrapper, market] = await Promise.all([
        UiWrapper.fetchFirstUserWrapper(connection.current, owner),
        Market.loadFromAddress({
          connection: connection.current,
          address: new PublicKey(unsettledMarket),
        }),
      ])
      const quoteMint = market.quoteMint()
      const baseMint = market.baseMint()
      const wrapperPk = wrapper!.pubkey

      const [quoteMintInfo, baseMintInfo] = await Promise.all([
        connection.current.getAccountInfo(quoteMint),
        connection.current.getAccountInfo(baseMint),
      ])

      const needToCreateWSolAcc =
        baseMint.equals(WRAPPED_SOL_MINT) || quoteMint.equals(WRAPPED_SOL_MINT)

      const traderTokenAccountBase = getAssociatedTokenAddressSync(
        baseMint,
        owner,
        true,
        baseMintInfo?.owner,
      )
      const traderTokenAccountQuote = getAssociatedTokenAddressSync(
        quoteMint,
        owner,
        true,
        quoteMintInfo?.owner,
      )
      const platformAta = getAssociatedTokenAddressSync(
        quoteMint,
        FEE_WALLET,
        true,
        quoteMintInfo?.owner,
      )

      const [platformAtaAccount, baseAtaAccount, quoteAtaAccount] =
        await Promise.all([
          connection.current.getAccountInfo(platformAta),
          connection.current.getAccountInfo(traderTokenAccountBase),
          connection.current.getAccountInfo(traderTokenAccountQuote),
        ])

      const doesPlatformAtaExists =
        platformAtaAccount && platformAtaAccount?.lamports > 0
      const doesTheBaseAtaExisits =
        baseAtaAccount && baseAtaAccount?.lamports > 0
      const doesTheQuoteAtaExisits =
        quoteAtaAccount && quoteAtaAccount?.lamports > 0

      if (!doesPlatformAtaExists) {
        const platformAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            platformAta,
            FEE_WALLET,
            quoteMint,
            quoteMintInfo?.owner,
          )
        prerequisiteInstructions.push(platformAtaCreateIx)
      }
      if (!doesTheQuoteAtaExisits) {
        const quoteAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            traderTokenAccountQuote,
            owner,
            quoteMint,
            quoteMintInfo?.owner,
          )
        prerequisiteInstructions.push(quoteAtaCreateIx)
      }
      if (!doesTheBaseAtaExisits) {
        const baseAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            traderTokenAccountBase,
            owner,
            baseMint,
            baseMintInfo?.owner,
          )
        prerequisiteInstructions.push(baseAtaCreateIx)
      }

      const settleOrderIx: TransactionInstruction =
        createSettleFundsInstruction(
          {
            wrapperState: wrapperPk,
            owner: owner,
            market: market.address,
            manifestProgram: MANIFEST_PROGRAM_ID,
            traderTokenAccountBase: traderTokenAccountBase,
            traderTokenAccountQuote: traderTokenAccountQuote,
            vaultBase: getVaultAddress(market.address, baseMint),
            vaultQuote: getVaultAddress(market.address, quoteMint),
            mintBase: baseMint,
            mintQuote: quoteMint,
            tokenProgramBase: baseMintInfo!.owner,
            tokenProgramQuote: quoteMintInfo!.owner,
            platformTokenAccount: platformAta,
          },
          {
            params: { feeMantissa: 10 ** 9 * 0.0001, platformFeePercent: 100 },
          },
        )
      ixes.push({
        serializedInstruction: serializeInstructionToBase64({
          ...settleOrderIx,
          keys: settleOrderIx.keys.map((x, idx) => {
            if (idx === 1) {
              return {
                ...x,
                isWritable: true,
              }
            }
            return x
          }),
        }),
        holdUpTime: 0,
      })

      if (needToCreateWSolAcc) {
        const wsolAta = getAssociatedTokenAddressSync(
          WRAPPED_SOL_MINT,
          owner,
          true,
        )
        const solTransferIx = createCloseAccountInstruction(
          wsolAta,
          owner,
          owner,
        )
        ixes.push({
          serializedInstruction: serializeInstructionToBase64(solTransferIx),
          holdUpTime: 0,
        })
      }
    }
    const proposalInstructions: InstructionDataWithHoldUpTime[] = []
    for (const index in ixes) {
      const ix = ixes[index]
      if (Number(index) === 0) {
        proposalInstructions.push({
          data: getInstructionDataFromBase64(
            typeof ix === 'string' ? ix : ix.serializedInstruction,
          ),
          holdUpTime: 0,
          prerequisiteInstructions: prerequisiteInstructions,
          prerequisiteInstructionsSigners: signers,
          chunkBy: 1,
        })
      } else {
        proposalInstructions.push({
          data: getInstructionDataFromBase64(
            typeof ix === 'string' ? ix : ix.serializedInstruction,
          ),
          holdUpTime: 0,
          prerequisiteInstructions: [],
          chunkBy: 1,
        })
      }
    }
    try {
      const proposalAddress = await handleCreateProposal({
        title: title,
        description: description,
        governance: selectedSolWallet!.governance,
        instructionsData: proposalInstructions,
        voteByCouncil: voteByCouncil,
        isDraft: false,
      })
      const url = fmtUrlWithCluster(
        `/dao/${router.query.symbol}/proposal/${proposalAddress}`,
      )

      router.push(url)
    } catch (ex) {
      notify({ type: 'error', message: `${ex}` })
    }
  }

  const cancelOrder = async (
    title: string,
    description: string,
    openOrderId: number,
  ) => {
    const ixes: (
      | string
      | {
          serializedInstruction: string
          holdUpTime: number
        }
    )[] = []
    const signers: Keypair[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []
    if (
      selectedSolWallet?.governance?.account &&
      wallet?.publicKey &&
      openOrders
    ) {
      const order = openOrders.find(
        (x) => x.clientOrderId.toString() === openOrderId.toString(),
      )
      const isBid = order?.isBid

      const owner = selectedSolWallet.extensions.transferAddress!

      const [wrapper, market] = await Promise.all([
        UiWrapper.fetchFirstUserWrapper(connection.current, owner),
        Market.loadFromAddress({
          connection: connection.current,
          address: new PublicKey(order!.market),
        }),
      ])

      const quoteMint = market.quoteMint()
      const baseMint = market.baseMint()
      const wrapperPk = wrapper!.pubkey

      const [quoteMintInfo, baseMintInfo] = await Promise.all([
        connection.current.getAccountInfo(quoteMint),
        connection.current.getAccountInfo(baseMint),
      ])

      const needToCreateWSolAcc =
        baseMint.equals(WRAPPED_SOL_MINT) || quoteMint.equals(WRAPPED_SOL_MINT)

      const traderTokenAccountBase = getAssociatedTokenAddressSync(
        baseMint,
        owner,
        true,
        baseMintInfo?.owner,
      )
      const traderTokenAccountQuote = getAssociatedTokenAddressSync(
        quoteMint,
        owner,
        true,
        quoteMintInfo?.owner,
      )
      const platformAta = getAssociatedTokenAddressSync(
        quoteMint,
        FEE_WALLET,
        true,
        quoteMintInfo?.owner,
      )

      const [platformAtaAccount, baseAtaAccount, quoteAtaAccount] =
        await Promise.all([
          connection.current.getAccountInfo(platformAta),
          connection.current.getAccountInfo(traderTokenAccountBase),
          connection.current.getAccountInfo(traderTokenAccountQuote),
        ])

      const doesPlatformAtaExists =
        platformAtaAccount && platformAtaAccount?.lamports > 0
      const doesTheBaseAtaExisits =
        baseAtaAccount && baseAtaAccount?.lamports > 0
      const doesTheQuoteAtaExisits =
        quoteAtaAccount && quoteAtaAccount?.lamports > 0

      if (!doesPlatformAtaExists) {
        const platformAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            platformAta,
            FEE_WALLET,
            quoteMint,
            quoteMintInfo?.owner,
          )
        prerequisiteInstructions.push(platformAtaCreateIx)
      }
      if (!doesTheQuoteAtaExisits) {
        const quoteAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            traderTokenAccountQuote,
            owner,
            quoteMint,
            quoteMintInfo?.owner,
          )
        prerequisiteInstructions.push(quoteAtaCreateIx)
      }
      if (!doesTheBaseAtaExisits) {
        const baseAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            traderTokenAccountBase,
            owner,
            baseMint,
            baseMintInfo?.owner,
          )
        prerequisiteInstructions.push(baseAtaCreateIx)
      }

      const mint = isBid ? quoteMint : baseMint
      const mintTokenProgram = isBid
        ? quoteMintInfo?.owner
        : baseMintInfo?.owner
      const cancelOrderIx: TransactionInstruction =
        createCancelOrderInstruction(
          {
            wrapperState: wrapperPk,
            owner: owner,
            traderTokenAccount: getAssociatedTokenAddressSync(
              mint,
              owner,
              true,
            ),
            market: market.address,
            vault: getVaultAddress(market.address, mint),
            mint: mint,
            systemProgram: SYSTEM_PROGRAM_ID,
            tokenProgram: mintTokenProgram,
            manifestProgram: MANIFEST_PROGRAM_ID,
          },
          {
            params: { clientOrderId: order!.clientOrderId },
          },
        )

      ixes.push({
        serializedInstruction: serializeInstructionToBase64({
          ...cancelOrderIx,
          keys: cancelOrderIx.keys.map((x, idx) => {
            if (idx === 1) {
              return {
                ...x,
                isWritable: true,
              }
            }
            return x
          }),
        }),
        holdUpTime: 0,
      })

      const settleOrderIx: TransactionInstruction =
        createSettleFundsInstruction(
          {
            wrapperState: wrapperPk,
            owner: owner,
            market: market.address,
            manifestProgram: MANIFEST_PROGRAM_ID,
            traderTokenAccountBase: traderTokenAccountBase,
            traderTokenAccountQuote: traderTokenAccountQuote,
            vaultBase: getVaultAddress(market.address, baseMint),
            vaultQuote: getVaultAddress(market.address, quoteMint),
            mintBase: baseMint,
            mintQuote: quoteMint,
            tokenProgramBase: baseMintInfo!.owner,
            tokenProgramQuote: quoteMintInfo!.owner,
            platformTokenAccount: platformAta,
          },
          {
            params: { feeMantissa: 10 ** 9 * 0.0001, platformFeePercent: 100 },
          },
        )
      ixes.push({
        serializedInstruction: serializeInstructionToBase64({
          ...settleOrderIx,
          keys: settleOrderIx.keys.map((x, idx) => {
            if (idx === 1) {
              return {
                ...x,
                isWritable: true,
              }
            }
            return x
          }),
        }),
        holdUpTime: 0,
      })

      if (needToCreateWSolAcc) {
        const wsolAta = getAssociatedTokenAddressSync(
          WRAPPED_SOL_MINT,
          owner,
          true,
        )
        const solTransferIx = createCloseAccountInstruction(
          wsolAta,
          owner,
          owner,
        )
        ixes.push({
          serializedInstruction: serializeInstructionToBase64(solTransferIx),
          holdUpTime: 0,
        })
      }
    }
    const proposalInstructions: InstructionDataWithHoldUpTime[] = []
    for (const index in ixes) {
      const ix = ixes[index]
      if (Number(index) === 0) {
        proposalInstructions.push({
          data: getInstructionDataFromBase64(
            typeof ix === 'string' ? ix : ix.serializedInstruction,
          ),
          holdUpTime: 0,
          prerequisiteInstructions: prerequisiteInstructions,
          prerequisiteInstructionsSigners: signers,
          chunkBy: 1,
        })
      } else {
        proposalInstructions.push({
          data: getInstructionDataFromBase64(
            typeof ix === 'string' ? ix : ix.serializedInstruction,
          ),
          holdUpTime: 0,
          prerequisiteInstructions: [],
          chunkBy: 1,
        })
      }
    }
    try {
      const proposalAddress = await handleCreateProposal({
        title: title,
        description: description,
        governance: selectedSolWallet!.governance,
        instructionsData: proposalInstructions,
        voteByCouncil: voteByCouncil,
        isDraft: false,
      })
      const url = fmtUrlWithCluster(
        `/dao/${router.query.symbol}/proposal/${proposalAddress}`,
      )

      router.push(url)
    } catch (ex) {
      notify({ type: 'error', message: `${ex}` })
    }
  }

  const { items: tableUnsettledOrders } = useSortableData(
    unselttedFormattedTableData(),
  )

  const proposeSwap = async (title: string, description: string) => {
    const ixes: (
      | string
      | {
          serializedInstruction: string
          holdUpTime: number
        }
    )[] = []
    const signers: (Keypair | null)[] = []
    const prerequisiteInstructions: TransactionInstruction[] = []
    const isBid = sideMode === 'Buy'
    if (selectedSolWallet && sellToken && wallet?.publicKey) {
      const orderId = Date.now()
      const owner = sellToken.isSol
        ? sellToken.extensions.transferAddress!
        : sellToken.extensions.token!.account.owner

      const baseTokenMint = !isBid
        ? sellToken.extensions.mint!.publicKey!
        : new PublicKey(buyToken!.address)

      const quoteTokenMint = !isBid
        ? new PublicKey(buyToken!.address)
        : sellToken.extensions.mint!.publicKey!

      const [wrapper, markets] = await Promise.all([
        UiWrapper.fetchFirstUserWrapper(connection.current, owner),
        Market.findByMints(connection.current, baseTokenMint, quoteTokenMint),
      ])

      let market = markets.length ? markets[0] : null

      if (!market) {
        const marketIxs = await Market.setupIxs(
          connection.current,
          baseTokenMint,
          quoteTokenMint,
          wallet.publicKey,
        )

        market = {
          address: marketIxs.signers[0].publicKey,
          baseMint: () => baseTokenMint,
          quoteMint: () => quoteTokenMint,
          baseDecimals: () =>
            !isBid
              ? sellToken.extensions.mint?.account.decimals
              : buyToken?.decimals,
          quoteDecimals: () =>
            !isBid
              ? buyToken?.decimals
              : sellToken.extensions.mint?.account.decimals,
        } as Market

        prerequisiteInstructions.push(...marketIxs.ixs)
        signers.push(
          ...marketIxs.signers.map((x) => Keypair.fromSecretKey(x.secretKey)),
          null,
        )
      }
      const quoteMint = market!.quoteMint()
      const baseMint = market!.baseMint()
      let wrapperPk = wrapper?.pubkey

      const [quoteMintInfo, baseMintInfo] = await Promise.all([
        connection.current.getAccountInfo(quoteMint),
        connection.current.getAccountInfo(baseMint),
      ])

      const needToCreateWSolAcc =
        baseMint.equals(WRAPPED_SOL_MINT) || quoteMint.equals(WRAPPED_SOL_MINT)

      if (needToCreateWSolAcc) {
        const wsolAta = getAssociatedTokenAddressSync(
          WRAPPED_SOL_MINT,
          owner,
          true,
        )
        const createPayerAtaIx =
          createAssociatedTokenAccountIdempotentInstruction(
            owner,
            wsolAta,
            owner,
            WRAPPED_SOL_MINT,
          )
        const solTransferIx = SystemProgram.transfer({
          fromPubkey: owner,
          toPubkey: wsolAta,
          lamports: toNative(
            Number(!isBid ? sellAmount : buyAmount),
            9,
          ).toNumber(),
        })

        const syncNative = createSyncNativeInstruction(wsolAta)
        ixes.push(
          serializeInstructionToBase64(createPayerAtaIx),
          serializeInstructionToBase64(solTransferIx),
          serializeInstructionToBase64(syncNative),
        )
      }

      if (!wrapperPk) {
        const setup = await UiWrapper.setupIxs(
          connection.current,
          owner,
          wallet.publicKey,
        )
        wrapperPk = setup.signers[0].publicKey

        prerequisiteInstructions.push(...setup.ixs)
        signers.push(
          ...setup.signers.map((x) => Keypair.fromSecretKey(x.secretKey)),
        )
      }

      const placeIx = await UiWrapper['placeIx_'](
        market,
        {
          wrapper: wrapperPk!,
          owner,
          payer: owner,
          baseTokenProgram: baseMintInfo?.owner,
          quoteTokenProgram: quoteMintInfo?.owner,
        },
        {
          isBid: isBid,
          amount: Number(!isBid ? sellAmount : buyAmount),
          price: Number(price),
          orderId: orderId,
        },
      )
      ixes.push(...placeIx.ixs.map((x) => serializeInstructionToBase64(x)))

      const traderTokenAccountBase = getAssociatedTokenAddressSync(
        baseMint,
        owner,
        true,
        baseMintInfo?.owner,
      )
      const traderTokenAccountQuote = getAssociatedTokenAddressSync(
        quoteMint,
        owner,
        true,
        quoteMintInfo?.owner,
      )
      const platformAta = getAssociatedTokenAddressSync(
        quoteMint,
        FEE_WALLET,
        true,
        quoteMintInfo?.owner,
      )

      const [platformAtaAccount, baseAtaAccount, quoteAtaAccount] =
        await Promise.all([
          connection.current.getAccountInfo(platformAta),
          connection.current.getAccountInfo(traderTokenAccountBase),
          connection.current.getAccountInfo(traderTokenAccountQuote),
        ])

      const doesPlatformAtaExists =
        platformAtaAccount && platformAtaAccount?.lamports > 0
      const doesTheBaseAtaExisits =
        baseAtaAccount && baseAtaAccount?.lamports > 0
      const doesTheQuoteAtaExisits =
        quoteAtaAccount && quoteAtaAccount?.lamports > 0

      if (!doesPlatformAtaExists) {
        const platformAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey!,
            platformAta,
            FEE_WALLET,
            quoteMint,
            quoteMintInfo?.owner,
          )
        prerequisiteInstructions.push(platformAtaCreateIx)
      }
      if (!doesTheQuoteAtaExisits) {
        const quoteAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            traderTokenAccountQuote,
            owner,
            quoteMint,
            quoteMintInfo?.owner,
          )
        prerequisiteInstructions.push(quoteAtaCreateIx)
      }
      if (!doesTheBaseAtaExisits) {
        const baseAtaCreateIx =
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            traderTokenAccountBase,
            owner,
            baseMint,
            baseMintInfo?.owner,
          )
        prerequisiteInstructions.push(baseAtaCreateIx)
      }
    }

    const proposalInstructions: InstructionDataWithHoldUpTime[] = []

    for (const index in ixes) {
      const ix = ixes[index]
      if (Number(index) === 0) {
        proposalInstructions.push({
          data: getInstructionDataFromBase64(
            typeof ix === 'string' ? ix : ix.serializedInstruction,
          ),
          holdUpTime: 0,
          prerequisiteInstructions: prerequisiteInstructions,
          prerequisiteInstructionsSigners: signers,
          chunkBy: 1,
        })
      } else {
        proposalInstructions.push({
          data: getInstructionDataFromBase64(
            typeof ix === 'string' ? ix : ix.serializedInstruction,
          ),
          holdUpTime: 0,
          prerequisiteInstructions: [],
          chunkBy: 1,
        })
      }
    }

    try {
      const proposalAddress = await handleCreateProposal({
        title: title,
        description: description,
        governance: selectedSolWallet!.governance,
        instructionsData: proposalInstructions,
        voteByCouncil: voteByCouncil,
        isDraft: false,
      })
      const url = fmtUrlWithCluster(
        `/dao/${router.query.symbol}/proposal/${proposalAddress}`,
      )

      router.push(url)
    } catch (ex) {
      notify({ type: 'error', message: `${ex}` })
    }
  }
  const handleSwitchSides = (side: 'Buy' | 'Sell') => {
    setSellAmount('0')
    setBuyAmount('0')
    if (side === 'Buy') {
      const usdcToSelect = governedTokenAccounts
        .filter(
          (x) =>
            wallet &&
            x.extensions.token?.account.owner.equals(
              selectedSolWallet!.extensions.transferAddress!,
            ),
        )
        .find((x) => x.extensions.mint?.publicKey.equals(USDC_MINT))
      if (usdcToSelect) {
        setSideMode('Buy')
        setSellToken(usdcToSelect)
        setBuyToken(wsolToken)
      } else {
        notify({
          type: 'warn',
          message:
            'No USDC detected in selected wallet buy USDC or change selected wallet',
        })
      }
    } else {
      setSideMode('Sell')
      setSellToken(null)
      setBuyToken(usdcToken)
    }
  }
  const openTokenSearchBox = (mode: SideMode) => {
    setSideMode(mode)
    setIsTokenSearchOpen(true)
  }

  return (
    <div
      className={`rounded-lg bg-bkg-2 p-6 min-h-full flex flex-col ${
        !selectedSolWallet ? 'pointer-events-none' : ''
      }`}
    >
      <header className="space-y-6 border-b border-white/10 pb-4">
        <PreviousRouteBtn />
      </header>
      <div className="gap-x-4 mb-6 flex items-center">
        <div className="w-[500px] mr-6">
          <GovernedAccountSelect
            label={'Wallet'}
            governedAccounts={governedTokenAccounts.filter((x) => x.isSol)}
            onChange={(value: AssetAccount) => setSelectedSolWallet(value)}
            value={selectedSolWallet}
            governance={selectedSolWallet?.governance}
            type="wallet"
          />
        </div>
        {shouldShowVoteByCouncilToggle && (
          <VoteBySwitch
            checked={voteByCouncil}
            onChange={() => {
              setVoteByCouncil(!voteByCouncil)
            }}
          ></VoteBySwitch>
        )}
      </div>
      <div className="flex flex-col items-center justify-center">
        {isTokenSearchOpen && (
          <Modal
            sizeClassName="sm:max-w-3xl"
            onClose={() => setIsTokenSearchOpen(false)}
            isOpen={isTokenSearchOpen}
          >
            <div>Select token</div>
            <TokenSearchBox
              selectSellToken={(assetAccount) => {
                setSellToken(assetAccount)
                setIsTokenSearchOpen(false)
              }}
              selectBuyToken={(assetAccount) => {
                setBuyToken(assetAccount)
                setIsTokenSearchOpen(false)
              }}
              wallet={selectedSolWallet?.extensions.transferAddress}
              mode={sideMode}
            ></TokenSearchBox>
          </Modal>
        )}
        {showCustomTitleModal && (
          <Modal
            sizeClassName="sm:max-w-3xl"
            onClose={() => setShowCustomTitleModal(false)}
            isOpen={showCustomTitleModal}
          >
            <div>Title and description</div>
            <DescriptionBox
              initTitle={initialTitle}
              callback={currentTitleCallback!}
            ></DescriptionBox>
          </Modal>
        )}
        <div className="w-full max-w-lg">
          <div className="shared-container relative py-6 md:px-2">
            <div className="bg-bkg-2">
              <div className="px-4">
                <div className="text-xs">Sell</div>
                <TokenBox
                  disabled={sideMode === 'Buy'}
                  onClick={() => openTokenSearchBox('Sell')}
                  img={img}
                  symbol={symbol}
                  uiAmount={uiAmount}
                ></TokenBox>
                <Input
                  labelAdditionalComponent={
                    <div className="flex">
                      <div
                        onClick={() => {
                          setSellAmount((uiAmount * 0.25).toString())
                        }}
                        className="text-xs mr-2 cursor-pointer hover:text-primary-light"
                      >
                        25%
                      </div>
                      <div
                        onClick={() => {
                          setSellAmount((uiAmount / 2).toString())
                        }}
                        className="text-xs mr-2 cursor-pointer hover:text-primary-light"
                      >
                        50%
                      </div>
                      <div
                        onClick={() => {
                          setSellAmount(
                            toUiDecimals(
                              toNative(
                                uiAmount,
                                sellToken?.extensions.mint?.account.decimals ||
                                  6,
                              ).toNumber() - 1,
                              sellToken?.extensions.mint?.account.decimals || 6,
                            ).toString(),
                          )
                        }}
                        className="text-xs cursor-pointer hover:text-primary-light"
                      >
                        Max
                      </div>
                    </div>
                  }
                  label="Sell amount"
                  className="w-full min-w-full mb-3 border-bkg-4"
                  type="number"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  placeholder="Sell amount"
                />
                <Input
                  label="Price per token"
                  className="w-full min-w-full mb-3 border-bkg-4"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                />
                <div className="flex items-center py-4">
                  <div className="h-px w-full bg-bkg-4" />
                  <Button
                    className="flex shrink-0 items-center justify-center rounded-full border border-bkg-4 bg-bkg-2"
                    onClick={() =>
                      handleSwitchSides(sideMode === 'Sell' ? 'Buy' : 'Sell')
                    }
                  >
                    <ArrowsUpDownIcon className="w-4 h-4 text-button-text" />
                  </Button>
                  <div className="h-px w-full bg-bkg-4" />
                </div>
                <div className="text-xs mb-3">Buy</div>
                <div>
                  <TokenBox
                    disabled={sideMode === 'Sell'}
                    onClick={() => openTokenSearchBox('Buy')}
                    img={buyToken?.logoURI}
                    symbol={buyToken?.symbol}
                  ></TokenBox>
                </div>
                <div className="text-xs mb-3">Amount</div>
                <div>
                  <Input
                    className="w-full min-w-full mb-3 border-bkg-4"
                    type="number"
                    value={buyAmount}
                    placeholder="Buy amount"
                  />
                </div>
                {connected ? (
                  <Button
                    className={`mt-4 flex h-12 w-full items-center justify-center rounded-full bg-button font-bold text-button-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:hover:bg-button-hover`}
                    disabled={!sellToken || !buyToken}
                    onClick={() => {
                      const sellTokenName =
                        tokenPriceService._tokenList.find(
                          (x) =>
                            x.address ===
                            sellToken?.extensions.mint?.publicKey.toBase58(),
                        )?.name ||
                        abbreviateAddress(
                          sellToken!.extensions.mint!.publicKey!,
                        )
                      const isBid = sideMode === 'Buy'

                      setShowCustomTitleModal(true)
                      setInitialTitle(
                        `${sideMode} ${
                          !isBid ? sellTokenName : buyToken?.name
                        } for ${isBid ? sellTokenName : buyToken?.name}`,
                      )
                      setCurrentTitleCallback(
                        () => (title: string, description: string) =>
                          proposeSwap(title, description),
                      )
                    }}
                  >
                    {loading ? <Loading /> : <span>Place limit order</span>}
                  </Button>
                ) : (
                  <Button
                    className={`mt-4 flex h-12 w-full items-center justify-center rounded-full bg-button font-bold text-button-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:hover:bg-button-hover`}
                    disabled={true}
                  >
                    <span>Please connect wallet</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="mt-6 mb-2 flex items-center">
          <span className="flex items-center">
            Settle your filled orders to transfer the funds to DAO wallet{' '}
            <span className="text-xs text-th-fgd-3 animate-pulse ml-3">
              <div className="ml-1 h-2 w-2 rounded-full bg-green-600 animate-ping [animation-duration:5s]"></div>
            </span>
          </span>
        </div>
        {tableUnsettledOrders?.length ? (
          <div>
            <div className="space-y-3 border border-bkg-4 p-6 mb-6">
              {tableUnsettledOrders.map((data, index) => {
                const {
                  marketName,
                  marketAddress,
                  imageUrl,
                  baseSymbol,
                  quoteSymbol,
                  uiAmountBase,
                  uiAmountQuote,
                  market,
                  quoteProgram,
                  baseProgram,
                } = data

                return (
                  <div
                    key={`${marketAddress}${uiAmountBase}${index}`}
                    className="flex items-center justify-between"
                  >
                    <div>
                      {loadingUnsettledBalances ? (
                        <Loading>
                          <div className="h-4 w-24 bg-th-bkg-2" />
                        </Loading>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <img
                            src={imageUrl}
                            height={24}
                            width={24}
                            alt="Token logo"
                          />
                          <div>
                            <p className="font-body text-xs text-th-fgd-1 xl:text-sm">
                              {marketName}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-th-fgd-1 xl:text-sm">
                      <div>
                        {uiAmountBase}
                        <span className="ml-1.5 font-body text-xs text-th-fgd-3">
                          {baseSymbol}
                        </span>
                      </div>
                      <div>
                        {uiAmountQuote}
                        <span className="ml-1.5 font-body text-xs text-th-fgd-3">
                          {quoteSymbol}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          className="bg-th-up !text-th-button-text md:hover:bg-th-up-dark"
                          onClick={() => {
                            setShowCustomTitleModal(true)
                            setInitialTitle('Settle limit order')
                            setCurrentTitleCallback(
                              () => (title: string, description: string) =>
                                settle(title, description, marketAddress),
                            )
                          }}
                        >
                          <CheckIcon className="w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-bkg-4 p-6 my-6">
            <div className="flex flex-col items-center">
              <p className="mb-1">No unsettled orders...</p>
            </div>
          </div>
        )}
      </div>
      <div className="mb-2 flex items-center">
        Open Orders{' '}
        <span className="text-xs text-th-fgd-3 animate-pulse ml-3">
          <div className="ml-1 h-2 w-2 rounded-full bg-green-600 animate-ping [animation-duration:5s]"></div>
        </span>
      </div>
      <div>
        {openOrders && openOrders?.length ? (
          <div className="border border-bkg-4 p-6 my-6 mt-0">
            <Table>
              <thead>
                <TrHead>
                  <Th>Order</Th>
                  <Th>Delta</Th>
                  <Th>Market price</Th>
                  <Th>Order price</Th>
                </TrHead>
              </thead>
              <tbody>
                {loadingFormattedOrders
                  ? [...Array(6)].map((x, i) => (
                      <Loading className="flex flex-1 rounded-none" key={i}>
                        <div
                          className={`h-12 w-full ${
                            i % 2 ? 'bg-th-bkg-2' : 'bg-th-bkg-3'
                          }`}
                        />
                      </Loading>
                    ))
                  : tableData.map((data, i) => {
                      const {
                        baseImageUrl,
                        baseSymbol,
                        baseName,
                        quoteImageUrl,
                        quoteSymbol,
                        quoteName,
                        baseMint,
                        quoteMint,
                        orderId,
                        price,
                        side,
                        size,
                        market,
                        isBid,
                        baseProgram,
                        quoteProgram,
                        value,
                        usdValue,
                      } = data

                      const baseTokenDetails = {
                        mint: baseMint.toBase58(),
                        name: baseName,
                        image_url: baseImageUrl,
                        symbol: baseSymbol,
                      }

                      const quoteTokenDetails = {
                        mint: quoteMint.toBase58(),
                        name: quoteName,
                        image_url: quoteImageUrl,
                        symbol: quoteSymbol,
                      }

                      return (
                        <TrBody
                          className="default-transition hover:bg-th-bkg-3 focus:outline-none"
                          key={`${orderId}${i}`}
                        >
                          <Td>
                            <div className="flex">
                              <div className="min-w-[300px]">
                                {loadingOpenOrders ? (
                                  <Loading>
                                    <div className="h-4 w-24 bg-th-bkg-2" />
                                  </Loading>
                                ) : (
                                  <>
                                    <div className="mb-1 flex items-center space-x-2">
                                      {baseImageUrl ? (
                                        <img
                                          src={baseImageUrl}
                                          height={16}
                                          width={16}
                                          alt={`${baseSymbol} token logo`}
                                        />
                                      ) : (
                                        <QuestionMarkCircleIcon className="w-4 text-th-fgd-4" />
                                      )}
                                      <div>
                                        <p
                                          className={`font-body text-xs xl:text-sm ${
                                            side === 'buy'
                                              ? 'text-th-up'
                                              : 'text-th-down'
                                          }`}
                                        >
                                          {side.toUpperCase()} {size.toString()}{' '}
                                          {baseSymbol}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {quoteImageUrl ? (
                                        <img
                                          src={quoteImageUrl}
                                          height={16}
                                          width={16}
                                          alt={`${quoteSymbol} token logo`}
                                        />
                                      ) : (
                                        <QuestionMarkCircleIcon className="w-4 text-th-fgd-4" />
                                      )}
                                      <div>
                                        <p
                                          className={`font-body text-xs xl:text-sm ${
                                            side !== 'buy'
                                              ? 'text-th-up'
                                              : 'text-th-down'
                                          }`}
                                        >
                                          {side === 'buy' ? 'SELL' : 'BUY'}{' '}
                                          {value} {quoteSymbol}
                                        </p>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </Td>
                          <Td
                            className={
                              price >
                              tokenPriceService.getUSDTokenPrice(baseMint)
                                ? 'text-green'
                                : 'text-red'
                            }
                          >
                            {price >
                            tokenPriceService.getUSDTokenPrice(baseMint)
                              ? '+'
                              : ''}
                            {(
                              ((price -
                                tokenPriceService.getUSDTokenPrice(baseMint)) /
                                tokenPriceService.getUSDTokenPrice(baseMint)) *
                              100
                            ).toFixed(2)}
                            %
                          </Td>
                          <Td>
                            {tokenPriceService.getUSDTokenPrice(baseMint)}
                          </Td>
                          <Td>{Number(price).toFixed(7)}</Td>
                          <Td className="flex justify-end">
                            <div className="flex-col items-end mr-3">
                              <p className="mb-1 h-4 text-xs text-th-fgd-2 xl:mb-1.5 xl:text-sm">
                                {price} {quoteSymbol} per {baseSymbol}
                              </p>
                              {usdValue ? (
                                <p className="h-4 text-xs xl:text-sm">
                                  ~$
                                  {usdValue}
                                </p>
                              ) : null}
                            </div>

                            <Button
                              className="bg-th-down !text-th-button-text md:hover:bg-th-down-dark"
                              disabled={cancelId === orderId}
                              onClick={() => {
                                setShowCustomTitleModal(true)
                                setInitialTitle('Cancel limit order')
                                setCurrentTitleCallback(
                                  () => (title: string, description: string) =>
                                    cancelOrder(title, description, orderId),
                                )
                              }}
                            >
                              {cancelId === Number(orderId) ? (
                                <Loading className="w-4" />
                              ) : (
                                <TrashIcon className="w-4" />
                              )}
                            </Button>
                          </Td>
                        </TrBody>
                      )
                    })}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-bkg-4 p-6">
            <div className="flex flex-col items-center">
              <p className="mb-1">No open limit orders...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
