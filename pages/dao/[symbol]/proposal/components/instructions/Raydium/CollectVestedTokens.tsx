import React, { useContext, useEffect, useState } from 'react'
import useRealm from '@hooks/useRealm'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import {
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { Governance, serializeInstructionToBase64 } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import {Raydium} from '@raydium-io/raydium-sdk-v2'
import { BN } from '@coral-xyz/anchor'
import { associatedAddress } from '@coral-xyz/anchor/dist/cjs/utils/token'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { WSOL_MINT_PK } from '@components/instructions/tools'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import { useLegacyVoterWeight } from '@hooks/queries/governancePower'
import { AssetAccount } from '@utils/uiTypes/assets'

const CollectVestedTokens = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const connection = useLegacyConnectionContext()
  const wallet = useWalletOnePointOh()
  const { realmInfo } = useRealm()
  const { assetAccounts } = useGovernanceAssets()
  const { result: ownVoterWeight } = useLegacyVoterWeight()
  const shouldBeGoverned = !!(index !== 0 && governance)

  const [governedAccount, setGovernedAccount] = useState<
    AssetAccount | undefined
  >(undefined)

  const mintA = realmInfo?.communityMint
 
  const { handleSetInstructions } = useContext(NewProposalContext)

  async function getInstruction(): Promise<UiInstruction> {
    if (
      governedAccount &&
      wallet?.publicKey &&
      mintA
    ) {
      const raydium = await Raydium.load({
        connection: connection.current,
        owner: governedAccount.pubkey
      })

      const LAUNCHPAD_PROGRAM_ID = new PublicKey("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj")
      const launchpadAuthority = new PublicKey("WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh")
      
      const [poolId] = PublicKey.findProgramAddressSync([
        Buffer.from("pool"),
        mintA.toBuffer(),
        WSOL_MINT_PK.toBuffer(),
      ], LAUNCHPAD_PROGRAM_ID)

      const vestingAccount = PublicKey.findProgramAddressSync([
        Buffer.from("pool_vesting"),
        poolId.toBuffer(),
        governedAccount.pubkey.toBuffer()
      ], LAUNCHPAD_PROGRAM_ID)[0]
    
      const vestingAccountInfo = await connection.current.getAccountInfo(vestingAccount)

      const vestingInstructions: TransactionInstruction[] = []

      if (!vestingAccountInfo) {
        const {transaction} = await raydium.launchpad.createVesting({
          beneficiary: governedAccount.pubkey,
          poolId,
          shareAmount: new BN(250000000000000),
        })

        vestingInstructions.push(...transaction.instructions)
      }
      
      const poolInfo = await raydium.launchpad.getRpcPoolInfo({poolId})

      if (!poolInfo.creator.equals(governedAccount.pubkey)) {
        throw new Error('The DAO does not own the vesting tokens.')
      }
      const baseVault = poolInfo.vaultA
      const walletAta = associatedAddress({mint: mintA,owner: governedAccount.pubkey})

      const keys = [
        { pubkey: governedAccount.pubkey, isSigner: true, isWritable: true },
        { pubkey: launchpadAuthority, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: vestingAccount, isSigner: false, isWritable: true },
        { pubkey: baseVault, isSigner: false, isWritable: true },
        { pubkey: walletAta, isSigner: false, isWritable: true },
        { pubkey: mintA, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ]

      const claimVestingInstruction: TransactionInstruction = {
        programId: LAUNCHPAD_PROGRAM_ID,
        data: Buffer.from([0x31, 0x21, 0x68, 0x1e, 0xbd, 0x9d, 0x4f, 0x23]),
        keys,
      }

      vestingInstructions.push(claimVestingInstruction)
      const additionalSerializedInstructions = vestingInstructions.map((ix) => serializeInstructionToBase64(ix))

      return {
        serializedInstruction : '',
        additionalSerializedInstructions,
        isValid: true,
        governance: governedAccount.governance,
        chunkBy: 1,
      }
    } else {
      return {
        serializedInstruction: '',
        isValid: false,
        governance: governedAccount?.governance,
        chunkBy: 1,
      }
    }
  }
  
  useEffect(() => {
    handleSetInstructions(
      { governedAccount: governedAccount?.governance, getInstruction },
      index,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [governedAccount, realmInfo, mintA])

  return (
    <>
      <GovernedAccountSelect
        label="Wallet"
        governedAccounts={assetAccounts.filter(
          (x) => ownVoterWeight?.canCreateProposal(x.governance.account.config),
        )}
        onChange={(value: AssetAccount) => setGovernedAccount(value)}
        value={governedAccount}
        shouldBeGoverned={shouldBeGoverned}
        governance={governance}
      />
    </>
  )
}

export default CollectVestedTokens
