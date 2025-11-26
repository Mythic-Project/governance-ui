import { useCallback } from 'react'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { fetchRealmByPubkey } from '@hooks/queries/realm'
import { useConnection } from '@solana/wallet-adapter-react'
import { Keypair, TransactionInstruction } from '@solana/web3.js'
import { approveTokenTransfer } from '@utils/tokens'
import useSelectedRealmPubkey from '@hooks/selectedRealm/useSelectedRealmPubkey'
import { withDepositGoverningTokens } from '@solana/spl-governance'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token-new' // <-- ici
import BN from 'bn.js'
import { fetchProgramVersion } from '@hooks/queries/useProgramVersionQuery'
import queryClient from '@hooks/queries/queryClient'
import { useJoinRealm } from '@hooks/useJoinRealm'
import { SequenceType, sendTransactionsV3 } from '@utils/sendTransactions'

export const useDepositCallback = (
    role: 'community' | 'council' | 'undefined',
) => {
    const { handleRegister } = useJoinRealm()
    const wallet = useWalletOnePointOh()
    const walletPk = wallet?.publicKey ?? undefined
    const realmPk = useSelectedRealmPubkey()
    const { connection } = useConnection()

    return useCallback(
        async (amount: BN) => {
            if (realmPk === undefined || walletPk === undefined) throw new Error()
            const { result: realm } = await fetchRealmByPubkey(connection, realmPk)
            if (!realm) throw new Error()

            const mint =
                role === 'community'
                    ? realm.account.communityMint
                    : realm.account.config.councilMint
            if (!mint) throw new Error()

            // ✅ ici on utilise TOKEN_2022_PROGRAM_ID
            const userAtaPk = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_2022_PROGRAM_ID,
                mint,
                walletPk, // owner
                true,
            )

            const instructions: TransactionInstruction[] = []
            const signers: Keypair[] = []

            const transferAuthority =
                wallet?.name === 'SquadsX'
                    ? undefined
                    : approveTokenTransfer(
                        instructions,
                        [],
                        userAtaPk,
                        wallet!.publicKey!,
                        amount,
                    )

            if (transferAuthority) signers.push(transferAuthority)

            const programVersion = await fetchProgramVersion(connection, realm.owner)
            const publicKeyToUse =
                transferAuthority != undefined && wallet?.publicKey != null
                    ? transferAuthority.publicKey
                    : wallet?.publicKey
            if (!publicKeyToUse) throw new Error()

            await withDepositGoverningTokens(
                instructions,
                realm.owner,
                programVersion,
                realm.pubkey,
                userAtaPk,
                mint,
                walletPk,
                publicKeyToUse,
                walletPk,
                amount,
            )

            const pluginRegisterInstructions = await handleRegister(false)

            const txes = [[...instructions, ...pluginRegisterInstructions]].map(
                (txBatch) => ({
                    instructionsSet: txBatch.map((x) => ({
                        transactionInstruction: x,
                        signers,
                    })),
                    sequenceType: SequenceType.Sequential,
                }),
            )

            await sendTransactionsV3({
                connection,
                wallet: wallet!,
                transactionInstructions: txes,
            })

            await queryClient.invalidateQueries({ queryKey: ['calculateVoterWeight'] })
        },
        [connection, handleRegister, realmPk, role, wallet, walletPk],
    )
}
