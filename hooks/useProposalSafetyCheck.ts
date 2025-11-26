// hooks/useProposalSafetyCheck.ts
import { useMemo } from 'react'
import { useAsync } from 'react-async-hook'
import { getNativeTreasuryAddress, Proposal, BPF_UPGRADE_LOADER_ID } from '@solana/spl-governance'
import { MANGO_INSTRUCTION_FORWARDER } from '@components/instructions/tools'
import { useBufferAccountsAuthority } from '@hooks/queries/bufferAuthority'
import { useGovernanceByPubkeyQuery } from '@hooks/queries/governance'
import { useSelectedProposalTransactions } from '@hooks/queries/proposalTransaction'
import { useRealmConfigQuery } from '@hooks/queries/realmConfig'
import useRealm from '@hooks/useRealm'

export const useProposalSafetyCheck = (proposal: Proposal) => {
    const config = useRealmConfigQuery().data?.result
    const { realmInfo } = useRealm()
    const { data: transactions } = useSelectedProposalTransactions()
    const { data: bufferAuthorities } = useBufferAccountsAuthority()
    const governance = useGovernanceByPubkeyQuery(proposal?.governance).data?.result

    const isUsingForwardProgram = transactions
        ?.flatMap(tx => tx.account.instructions?.map(ins => ins.programId.toBase58()) || [])
        .filter(x => x === MANGO_INSTRUCTION_FORWARDER).length

    const treasuryAddress = useAsync(
        async () =>
            governance ? getNativeTreasuryAddress(governance.owner, governance.pubkey) : undefined,
        [governance]
    )

    const walletsPassedToInstructions = transactions?.flatMap(
        tx => tx.account.instructions?.flatMap(ins => ins.accounts.map(acc => acc.pubkey))
    )

    return useMemo(() => {
        if (!realmInfo || !transactions) return []

        const ixs = transactions.flatMap(pix => pix.account.getAllInstructions())

        const possibleWrongGovernance =
            treasuryAddress.result &&
            transactions.length &&
            !walletsPassedToInstructions?.some(
                x => x && (governance?.pubkey?.equals(x) || treasuryAddress.result?.equals(x))
            )

        const proposalWarnings: (
            | 'setGovernanceConfig'
            | 'setRealmConfig'
            | 'thirdPartyInstructionWritesConfig'
            | 'possibleWrongGovernance'
            | 'programUpgrade'
            | 'usingMangoInstructionForwarder'
            | 'bufferAuthorityMismatch'
            | undefined
            )[] = []

        ixs.forEach(ix => {
            if (ix.programId.equals(realmInfo.programId) && ix.data[0] === 19)
                return proposalWarnings.push('setGovernanceConfig')
            if (ix.programId.equals(realmInfo.programId) && ix.data[0] === 22)
                return proposalWarnings.push('setRealmConfig')
            if (ix.programId.equals(BPF_UPGRADE_LOADER_ID))
                return proposalWarnings.push('programUpgrade')
            if (ix.accounts.find(a => a.isWritable && config && a.pubkey.equals(config.pubkey))) {
                if (ix.programId.equals(realmInfo.programId))
                    proposalWarnings.push('setRealmConfig')
                else
                    proposalWarnings.push('thirdPartyInstructionWritesConfig')
            }
            if (isUsingForwardProgram)
                proposalWarnings.push('usingMangoInstructionForwarder')
        })

        if (possibleWrongGovernance)
            proposalWarnings.push('possibleWrongGovernance')
        if (treasuryAddress.result && governance) {
            const treasury = treasuryAddress.result
            if (bufferAuthorities?.some(authority => !authority.equals(treasury) && !authority.equals(governance.pubkey)))
                proposalWarnings.push('bufferAuthorityMismatch')
        }

        return proposalWarnings
    }, [
        realmInfo,
        config,
        transactions,
        walletsPassedToInstructions,
        governance,
        bufferAuthorities,
        isUsingForwardProgram,
        treasuryAddress.result,
    ])
}
