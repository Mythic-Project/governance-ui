import React, { useContext, useEffect, useState } from 'react'
import useRealm from '@hooks/useRealm'
import { PublicKey } from '@solana/web3.js'
import {
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance, serializeInstructionToBase64 } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { DasNftObject, useRaydiumAssetsByOwner } from '@hooks/queries/digitalAssets'
import GovernanceAccountSelect from '../../GovernanceAccountSelect'
import { SplGovernance } from 'governance-idl-sdk'
import Select from '@components/inputs/Select'
import {Raydium} from '@raydium-io/raydium-sdk-v2'
import { BN } from '@coral-xyz/anchor'

interface RaydiumDasNftObject extends DasNftObject {
  name: string
  poolId: string
  lpAmount: BN
  mintARewardAmount: string
  mintBRewardAmount: string
  mintA: string
  mintB: string
}

const CollectPoolFees = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const connection = useLegacyConnectionContext()
  const wallet = useWalletOnePointOh()
  const { governancesArray } = useGovernanceAssets()
  const [selectedNft, setSelectedNft] = useState<RaydiumDasNftObject | null>(null)

  const [governedAccount, setGovernedAccount] = useState<
    ProgramAccount<Governance> | undefined
  >(undefined)

  const splGovernance = new SplGovernance(connection.current)
  const nativeAddress = governedAccount?.pubkey ?
    splGovernance.pda.nativeTreasuryAccount({governanceAccount: governedAccount.pubkey}).publicKey :
    undefined

  const {data: assets} = useRaydiumAssetsByOwner(nativeAddress)
  const raydiumNfts = assets?.filter((asset) => asset.name !== undefined)
 
  const { handleSetInstructions } = useContext(NewProposalContext)

  async function getInstruction(): Promise<UiInstruction> {
    if (
      governedAccount?.account &&
      wallet?.publicKey &&
      selectedNft
    ) {
      const raydium = await Raydium.load({
        connection: connection.current,
        owner: nativeAddress,
      })
    
      if (selectedNft.lpAmount.isZero()) {
        throw new Error('No rewards to claim.')
      }

      const poolData = await raydium.cpmm.getRpcPoolInfo(selectedNft.poolId)
      const poolInfo = await raydium.cpmm.getCpmmPoolKeys(selectedNft.poolId)

      const harvestLpFeesIxs = await raydium.cpmm.harvestLockLp({
        nftMint: new PublicKey(selectedNft.id),
        poolInfo: {
          programId: poolInfo.programId,
          id: poolInfo.id,
          mintA: poolInfo.mintA,
          mintB: poolInfo.mintB,
          rewardDefaultInfos: [],
          rewardDefaultPoolInfos: "Raydium",
          price: parseInt(poolData.poolPrice.toString()),
          mintAmountA: 0,
          mintAmountB: 0,
          feeRate: 0,
          openTime: poolInfo.openTime,
          tvl: 0,
          pooltype: [],
          farmUpcomingCount: 0,
          farmFinishedCount: 0,
          farmOngoingCount: 0,
          burnPercent: 0,
          day: {
            volume: 0,
            volumeQuote: 0,
            volumeFee: 0,
            apr: 0,
            feeApr: 0,
            priceMin: 0,
            priceMax: 0,
            rewardApr: []
          },
          week: {
            volume: 0,
            volumeQuote: 0,
            volumeFee: 0,
            apr: 0,
            feeApr: 0,
            priceMin: 0,
            priceMax: 0,
            rewardApr: []
          },
          month: {
            volume: 0,
            volumeQuote: 0,
            volumeFee: 0,
            apr: 0,
            feeApr: 0,
            priceMin: 0,
            priceMax: 0,
            rewardApr: []
          },
          lpAmount: 0,
          lpMint: poolInfo.mintLp,
          lpPrice: 0,
          type: 'Standard',
          config: poolInfo.config
        },
        lpFeeAmount: selectedNft.lpAmount,
      })
    
      const additionalSerializedInstructions = harvestLpFeesIxs.transaction.instructions.map((ix) => serializeInstructionToBase64(ix))
      return {
        serializedInstruction : '',
        additionalSerializedInstructions,
        isValid: true,
        governance: governedAccount,
        chunkBy: 1,
      }
    } else {
      return {
        serializedInstruction: '',
        isValid: false,
        governance: governedAccount,
        chunkBy: 1,
      }
    }
  }
  
  useEffect(() => {
    handleSetInstructions(
      { governedAccount: governedAccount, getInstruction },
      index,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [selectedNft, governedAccount])

  return (
    <>
      <GovernanceAccountSelect
        label="Governance"
        governanceAccounts={governancesArray}
        onChange={(value) => {
          setGovernedAccount(value)
        }}
        value={governedAccount}
      />

      <Select
        onChange={(value) => setSelectedNft(value)}
        label="Select Pool"
        placeholder="Select..."
        value={selectedNft?.id}
      >
        {raydiumNfts?.map((asset) => (
          <Select.Option key={asset.id} value={asset}>
            {asset.name}
          </Select.Option>
        ))}
      </Select>
        {selectedNft?.mintARewardAmount && selectedNft.mintBRewardAmount ?
          <p>Rewards Available to Claim: {selectedNft.mintARewardAmount} {selectedNft.mintA}, {selectedNft.mintBRewardAmount} {selectedNft.mintB}
          </p> :
          null
        }
    </>
  )
}

export default CollectPoolFees
