import { useState } from 'react'
import BigNumber from 'bignumber.js'
import { useRouter } from 'next/router'
import * as yup from 'yup'
import { useQuery } from '@tanstack/react-query'
import { BN } from '@coral-xyz/anchor'
import { getAssociatedTokenAddressSync } from '@solana/spl-token-new'
import Button, { LinkButton } from '@components/Button'
import Input from '@components/inputs/Input'
import Loading from '@components/Loading'
import Tooltip from '@components/Tooltip'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import useQueryContext from '@hooks/useQueryContext'
import useRealm from '@hooks/useRealm'
import { getProgramVersionForRealm } from '@models/registry/api'
import { RpcContext } from '@solana/spl-governance'
import {
  getMintDecimalAmount,
  getMintMinAmountAsDecimal,
  getMintNaturalAmountFromDecimalAsBN,
} from '@tools/sdk/units'
import { precision } from '@utils/formatting'
import tokenPriceService from '@utils/services/tokenPrice'
import AdditionalProposalOptions from '@components/AdditionalProposalOptions'
import { validateInstruction } from '@utils/instructionTools'
import { handleSolendActionV2 } from 'Strategies/protocols/solend'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useRealmQuery } from '@hooks/queries/realm'
import { useRealmConfigQuery } from '@hooks/queries/realmConfig'
import {
  useRealmCommunityMintInfoQuery,
  useRealmCouncilMintInfoQuery,
} from '@hooks/queries/mintInfo'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { useRealmProposalsQuery } from '@hooks/queries/proposal'
import { useLegacyVoterWeight } from '@hooks/queries/governancePower'
import { useVotingClients } from '@hooks/useVotingClients'
import { useVoteByCouncilToggle } from '@hooks/useVoteByCouncilToggle'
import { Plan, Position } from '@hub/providers/Defi'
import { useTokenAccountsByOwnerQuery } from '@hooks/queries/tokenAccount'
import { Wallet } from '@models/treasury/Wallet'
import Modal from '@components/Modal'
import { AssetType, Token } from '@models/treasury/Asset'
import queryClient from '@hooks/queries/queryClient'
import { notify } from '@utils/notifications'
import { useFetchConfig } from '@hub/providers/Defi/plans/save'

const SOL_BUFFER = 0.02 * LAMPORTS_PER_SOL;

const SaveDepositModal = ({
  plan,
  positions,
  onClose,
  isOpen,
  wallet,
}: {
  plan: Plan
  positions: Position[]
  onClose: () => void
  isOpen: boolean
  wallet: Wallet
}) => {
  const isSol =
    plan.assets[0].mintAddress === 'So11111111111111111111111111111111111111112'
  const [depositFromWallet, setDepositFromWallet] = useState(true)
  const position = positions.find(p => p.planId === plan.id && p.walletAddress === wallet.address) as Position | undefined
  const mainPoolConfig = useFetchConfig().data?.find((c) => c.isPrimary)
  const {
    governedTokenAccountsWithoutNfts,
    auxiliaryTokenAccounts,
  } = useGovernanceAssets()
  const accounts = [
    ...governedTokenAccountsWithoutNfts,
    ...auxiliaryTokenAccounts,
  ]
  const router = useRouter()

  const { fmtUrlWithCluster } = useQueryContext()
  const realm = useRealmQuery().data?.result
  const { symbol } = router.query
  const userWallet = useWalletOnePointOh()
  const { data: tokenAccounts } = useTokenAccountsByOwnerQuery(
    userWallet?.publicKey ?? undefined
  )
  const tokenAccount = userWallet?.publicKey
    ? tokenAccounts?.find(
        (t) =>
          t.account.mint.toBase58() === plan.assets[0].mintAddress &&
          getAssociatedTokenAddressSync(
            t.account.mint,
            userWallet.publicKey!
          ).toBase58() === t.account.address.toBase58()
      )
    : undefined
  const tokenAccountFromDao = wallet.assets?.find(
    (t) =>
      t.type === AssetType.Token && t.mintAddress === plan.assets[0].mintAddress
  ) as Token | undefined
  const config = useRealmConfigQuery().data?.result
  const mint = useRealmCommunityMintInfoQuery().data?.result
  const governedTokenAccount = isSol
    ? accounts.find(
        (account) =>
          account.isSol &&
          account.governance.nativeTreasuryAddress.toBase58() === wallet.address
      )!
    : accounts.find(
        (account) => account.pubkey.toBase58() === tokenAccountFromDao?.address
      )
  const councilMint = useRealmCouncilMintInfoQuery().data?.result
  const { result: ownVoterWeight } = useLegacyVoterWeight()
  const { realmInfo } = useRealm()
  const proposals = useRealmProposalsQuery().data
  const [isDepositing, setIsDepositing] = useState(false)
  const { voteByCouncil, setVoteByCouncil } = useVoteByCouncilToggle()
  const votingClients = useVotingClients()
  const connection = useLegacyConnectionContext()

  const { data: solBalance } = useQuery({
    queryKey: [userWallet?.publicKey?.toBase58() ?? ''],
    queryFn: async () =>
      queryClient.fetchQuery<number>({
        queryKey: [userWallet?.publicKey?.toBase58() ?? ''],
        queryFn: () => {
          if (!userWallet?.publicKey) return 0
          return connection.current.getBalance(userWallet.publicKey)
        },
      }),
  })

  const tokenInfo = tokenPriceService.getTokenInfo(plan.assets[0].mintAddress)
  const {
    canUseTransferInstruction: canUseTransferInstructionFromDao,
  } = useGovernanceAssets()

  const canUseTransferInstruction = depositFromWallet
    ? userWallet?.publicKey
    : canUseTransferInstructionFromDao

  const treasuryAmount = governedTokenAccount
    ? new BN(
        governedTokenAccount.isSol
          ? governedTokenAccount.extensions.amount!.toNumber()
          : governedTokenAccount.extensions.token!.account.amount
      )
    : new BN(0)
  const mintInfo = {
    decimals: plan.assets[0].decimals,
  }
  const tokenSymbol = plan.assets[0].symbol
  const [form, setForm] = useState<{
    title: string
    description: string
    amount?: number
    max: boolean
  }>({
    title: '',
    description: '',
    amount: undefined,
    max: false,
  })
  const [formErrors, setFormErrors] = useState({})
  const proposalTitle = `Deposit ${form.amount ? `${form.amount} ` : ''}${
    tokenSymbol || 'tokens'
  } into Save`
  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value })
  }
  const mintMinAmount = mintInfo ? getMintMinAmountAsDecimal(mintInfo) : 1
  const walletBalance = isSol
    ? new BN(solBalance ?? 0).sub(new BN(SOL_BUFFER))
    : new BN(tokenAccount?.account.amount.toString() ?? 0)

  let maxAmount =
    (mintInfo
      ? depositFromWallet
        ? getMintDecimalAmount(mintInfo, walletBalance)
        : getMintDecimalAmount(mintInfo, treasuryAmount)
      : new BigNumber(0)) ?? new BigNumber(0)

  if (governedTokenAccount?.isSol) {
    maxAmount = BigNumber.max(0, maxAmount.minus(0))
  }
  const maxAmountFtm = maxAmount.toNumber().toFixed(4)
  const currentPrecision = precision(mintMinAmount)

  const validateAmountOnBlur = () => {
    handleSetForm({
      propertyName: 'amount',
      value: parseFloat(
        Math.max(
          Number(mintMinAmount),
          Math.min(Number(Number.MAX_SAFE_INTEGER), Number(form.amount))
        ).toFixed(currentPrecision)
      ),
    })
  }

  const handleDeposit = async () => {
    if (!mainPoolConfig) throw new Error('Main pool config not found')
      const reserve = mainPoolConfig?.reserves.find((r) => r.address === plan.id)
      if (!reserve) throw new Error('Reserve not found')
    if (depositFromWallet) {
      if (!wallet?.address) return
      setIsDepositing(true)
      try {
        await plan.deposit(Number(form.amount), wallet.address)
      } catch (e) {
        notify({ type: 'error', message: `${e}` })
      } finally {
        setIsDepositing(false)
      }
      return
    }

    if (ownVoterWeight === undefined) throw new Error()
    if (proposals === undefined) throw new Error()
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    if (!isValid) {
      return
    }
    try {
      setIsDepositing(true)
      const rpcContext = new RpcContext(
        new PublicKey(realm!.owner.toString()),
        getProgramVersionForRealm(realmInfo!),
        userWallet!,
        connection.current,
        connection.endpoint
      )
      const ownTokenRecord = ownVoterWeight.getTokenRecordToCreateProposal(
        governedTokenAccount!.governance!.account.config,
        voteByCouncil
      )
      const defaultProposalMint = voteByCouncil
        ? realm?.account.config.councilMint
        : !mint?.supply.isZero() ||
          config?.account.communityTokenConfig.maxVoterWeightAddin
        ? realm!.account.communityMint
        : !councilMint?.supply.isZero()
        ? realm!.account.config.councilMint
        : undefined

      const proposalAddress = await handleSolendActionV2(
        rpcContext,
        {
          ...form,
          action: 'Deposit',
          reserveAddress: plan.id,
          bnAmount: getMintNaturalAmountFromDecimalAsBN(
            form.amount as number,
            plan.assets[0].decimals
          ),
          amountFmt: (form.amount as number).toFixed(4),
        },
        realm!,
        governedTokenAccount!,
        ownTokenRecord,
        defaultProposalMint!,
        governedTokenAccount!.governance!.account!.proposalCount,
        false,
        connection,
        mainPoolConfig,
        reserve,
        votingClients(voteByCouncil ? 'council' : 'community')
      )
      const url = fmtUrlWithCluster(
        `/dao/${symbol}/proposal/${proposalAddress}`
      )
      router.push(url)
    } catch (e) {
      notify({ type: 'error', message: `${e}` })
      throw e
    } finally {
      setIsDepositing(false)
    }
  }
  const schema = yup.object().shape({
    amount: yup
      .number()
      .required('Amount is required')
      .min(mintMinAmount)
      .max(maxAmount.toNumber()),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex mb-1.5 text-sm">
        Amount
        <div className="ml-auto flex items-center text-xs">
          <span className="text-fgd-3 mr-1">Bal:</span> {maxAmountFtm}
          <LinkButton
            onClick={() =>
              handleSetForm({
                propertyName: 'amount',
                value: maxAmount.toNumber(),
              })
            }
            className="font-bold ml-2 text-primary-light"
          >
            Max
          </LinkButton>
        </div>
      </div>
      <Input
        error={formErrors['amount']}
        min={mintMinAmount}
        value={form.amount}
        type="number"
        onChange={(e) =>
          handleSetForm({ propertyName: 'amount', value: e.target.value })
        }
        step={mintMinAmount}
        onBlur={validateAmountOnBlur}
      />

      <AdditionalProposalOptions
        allowWalletDeposit={depositFromWallet}
        setAllowWalletDeposit={setDepositFromWallet}
        title={form.title}
        description={form.description}
        defaultTitle={proposalTitle}
        defaultDescription={`Deposit ${tokenSymbol} into Save`}
        setTitle={(evt) =>
          handleSetForm({
            value: evt.target.value,
            propertyName: 'title',
          })
        }
        setDescription={(evt) =>
          handleSetForm({
            value: evt.target.value,
            propertyName: 'description',
          })
        }
        voteByCouncil={voteByCouncil}
        setVoteByCouncil={setVoteByCouncil}
      />
      <div className="border border-fgd-4 p-4 rounded-md mb-6 mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-fgd-3">Current Deposits</span>
          <span className="font-bold text-fgd-1">
            {position?.amount?.toFixed(4) || 0}{' '}
            <span className="font-normal text-fgd-3">{tokenInfo?.symbol}</span>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-fgd-3">
            {depositFromWallet ? 'Amount to deposit' : 'Proposed deposit'}
          </span>
          <span className="font-bold text-fgd-1">
            {form.amount?.toLocaleString() || (
              <span className="font-normal text-red">Enter an amount</span>
            )}{' '}
            <span className="font-normal text-fgd-3">{tokenInfo?.symbol}</span>
          </span>
        </div>
      </div>
      <Button
        className="w-full"
        onClick={handleDeposit}
        disabled={!form.amount || !canUseTransferInstruction || isDepositing}
      >
        <Tooltip
          content={
            !canUseTransferInstruction
              ? depositFromWallet
                ? 'Please connect wallet'
                : 'Please connect wallet with enough voting power to create treasury proposals'
              : !form.amount
              ? 'Please input the amount'
              : ''
          }
        >
          {!isDepositing ? (depositFromWallet ? 'Deposit' : 'Propose deposit') : <Loading></Loading>}
        </Tooltip>
      </Button>
    </Modal>
  )
}

export default SaveDepositModal
