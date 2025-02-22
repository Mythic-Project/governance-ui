import Button, { LinkButton } from '@components/Button'
import Input from '@components/inputs/Input'
import Loading from '@components/Loading'
import Tooltip from '@components/Tooltip'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import useQueryContext from '@hooks/useQueryContext'
import useRealm from '@hooks/useRealm'
import { getProgramVersionForRealm } from '@models/registry/api'
import { BN } from '@coral-xyz/anchor'
import { RpcContext } from '@solana/spl-governance'
import {
  getMintMinAmountAsDecimal,
  getMintNaturalAmountFromDecimal,
} from '@tools/sdk/units'
import { precision } from '@utils/formatting'
import tokenPriceService from '@utils/services/tokenPrice'
import BigNumber from 'bignumber.js'
import { useRouter } from 'next/router'
import { useState } from 'react'
import AdditionalProposalOptions from '@components/AdditionalProposalOptions'
import { validateInstruction } from '@utils/instructionTools'
import * as yup from 'yup'
import { PublicKey } from '@solana/web3.js'
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
import { useFetchReserveInfo } from '@hub/providers/Defi/plans/save'
import Modal from '@components/Modal'
import { handleSolendActionV2 } from 'Strategies/protocols/solend'
import { Plan, Position } from '@hub/providers/Defi'
import { Wallet } from '@models/treasury/Wallet'
import { notify } from '@utils/notifications'

const WithdrawModal = ({
  plan,
  positions,
  onClose,
  isOpen,
  wallet: governanceWallet,
}: {
  plan: Plan
  positions: Position[]
  onClose: () => void
  isOpen: boolean
  wallet: Wallet
}) => {
  const position = positions.find(p => p.planId === plan.id && p.walletAddress === governanceWallet.address) as Position | undefined
  const {
    governedTokenAccountsWithoutNfts,
    auxiliaryTokenAccounts,
  } = useGovernanceAssets()
  const accounts = [
    ...governedTokenAccountsWithoutNfts,
    ...auxiliaryTokenAccounts,
  ]
  const governedTokenAccount = accounts.find(
    (account) => account.pubkey.toBase58() === position?.accountAddress
  )
  const { canUseTransferInstruction } = useGovernanceAssets()
  const cTokenBalance =
    governedTokenAccount?.extensions.token?.account.amount ?? 0

  const router = useRouter()
  const { fmtUrlWithCluster } = useQueryContext()
  const realm = useRealmQuery().data?.result
  const { symbol } = router.query
  const config = useRealmConfigQuery().data?.result
  const mint = useRealmCommunityMintInfoQuery().data?.result
  const councilMint = useRealmCouncilMintInfoQuery().data?.result
  const { result: ownVoterWeight } = useLegacyVoterWeight()
  const { realmInfo } = useRealm()
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const { voteByCouncil, setVoteByCouncil } = useVoteByCouncilToggle()
  const { data: reservesInfo } = useFetchReserveInfo([plan.id])
  const votingClients = useVotingClients()
  const proposals = useRealmProposalsQuery().data
  const connection = useLegacyConnectionContext()
  const wallet = useWalletOnePointOh()
  const tokenInfo = tokenPriceService.getTokenInfo(plan.assets[0].mintAddress)
  const mintInfo = governedTokenAccount?.extensions?.mint?.account
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
  const proposalTitle = `Withdraw ${form.amount ? `${form.amount} ` : ''}${
    tokenSymbol || 'tokens'
  } from Save`
  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({
      ...form,
      max: propertyName === 'amount' ? false : form.max,
      [propertyName]: value,
    })
  }
  const mintMinAmount = mintInfo ? getMintMinAmountAsDecimal(mintInfo) : 1
  const maxAmount = new BigNumber(position?.amount ?? 0)
  const maxAmountFtm = maxAmount.toFixed(4)
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

  const handleWithdraw = async () => {
    if (!reservesInfo?.[0]) throw new Error('Reserve not found')
    if (ownVoterWeight === undefined) throw new Error()
    if (proposals === undefined) throw new Error()
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    if (!isValid) {
      return
    }
    try {
      setIsWithdrawing(true)
      const rpcContext = new RpcContext(
        new PublicKey(realm!.owner.toString()),
        getProgramVersionForRealm(realmInfo!),
        wallet!,
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
          action: 'Withdraw',
          reserveAddress: plan.id,
          bnAmount: form.max
            ? new BN(cTokenBalance)
            : new BN(
                Math.floor(
                  getMintNaturalAmountFromDecimal(
                    (form.amount as number) /
                      (reservesInfo?.[0].cTokenExchangeRate ?? 1),
                    governedTokenAccount?.extensions.mint!.account.decimals ?? 0
                  )
                ).toString()
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
      setIsWithdrawing(false)
    }
  }
  const schema = yup.object().shape({
    amount: yup
      .number()
      .required('Amount is required')
      .max(new BigNumber(position?.amount ?? 0).toNumber()),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex mb-1.5 text-sm">
        Amount
        <div className="ml-auto flex items-center text-xs">
          <span className="text-fgd-3 mr-1">Bal:</span> {maxAmountFtm}
          <LinkButton
            onClick={() => {
              setFormErrors({})
              setForm({
                ...form,
                amount: Number(maxAmount.toFixed(mintInfo?.decimals ?? 0, BigNumber.ROUND_FLOOR)),
                max: true,
              })
            }}
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
        title={form.title}
        description={form.description}
        defaultTitle={proposalTitle}
        defaultDescription={`Withdraw ${tokenSymbol} from Save`}
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
          <span className="text-fgd-3">Proposed Withdraw</span>
          <span className="font-bold text-fgd-1">
            {form.amount?.toLocaleString() || (
              <span className="font-normal text-red">Enter an amount</span>
            )}{' '}
            <span className="font-normal text-fgd-3">
              {form.amount && tokenInfo?.symbol}
            </span>
          </span>
        </div>
      </div>
      <Button
        className="w-full"
        onClick={handleWithdraw}
        disabled={!form.amount || !canUseTransferInstruction || isWithdrawing}
      >
        <Tooltip
          content={
            !canUseTransferInstruction
              ? 'Please connect wallet with enough voting power to create treasury proposals'
              : !form.amount
              ? 'Please input the amount'
              : ''
          }
        >
          {!isWithdrawing ? 'Propose withdraw' : <Loading></Loading>}
        </Tooltip>
      </Button>
    </Modal>
  )
}

export default WithdrawModal
