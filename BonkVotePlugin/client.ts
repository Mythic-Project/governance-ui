import { Provider, BN, Program } from '@coral-xyz/anchor'
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js'
import idl from './idl.json'
import tokenIdl from './token-idl.json'
import { BonkPlugin } from './type'
import { Client } from '@solana/governance-program-library'
import { fetchRealmByPubkey } from '@hooks/queries/realm'
import { TokenVoter } from './token-type'
import {
  bonkRegistrarKey,
  bonkSdrKey,
  bonkVwrKey,
  tokenVoterKey,
  tokenVwrKey,
} from './utils'
import { SplTokenStaking, stakingIdl } from './stake'
import {
  VoterWeightAction,
  getTokenOwnerRecordAddress,
} from '@solana/spl-governance'
import { BONK_PLUGIN_PK } from '@constants/plugins'

export class BonkClient extends Client<BonkPlugin> {
  readonly requiresInputVoterWeight = true
  private tokenPlugin: Program<TokenVoter>
  private splTokenStaking: Program<SplTokenStaking>

  constructor(
    public program: Program<BonkPlugin>,
    tokenVoterProgram: Program<TokenVoter>,
    splTokenProgram: Program<SplTokenStaking>,
  ) {
    super(program)
    this.tokenPlugin = tokenVoterProgram
    this.splTokenStaking = splTokenProgram
  }

  private async fetchSdrs(voter: PublicKey, stakePool: PublicKey) {
    const sdrs = await this.splTokenStaking.account.stakeDepositReceipt.all([
      {
        memcmp: {
          offset: 8,
          bytes: voter.toBase58(),
        },
      },
      {
        memcmp: {
          offset: 72,
          bytes: stakePool.toBase58(),
        },
      },
    ])

    const activeSdrs = sdrs.filter(
      (sdr) =>
        sdr.account.depositTimestamp
          .add(sdr.account.lockupDuration)
          .toNumber() >
        Date.now() / 1000,
    )

    return activeSdrs
  }

  async calculateMaxVoterWeight(
    _realm: PublicKey,
    _mint: PublicKey,
  ): Promise<BN | null> {
    const { result: realm } = await fetchRealmByPubkey(
      this.program.provider.connection,
      _realm,
    )

    return realm?.account.config?.communityMintMaxVoteWeightSource.value ?? null // TODO this code should not actually be called because this is not a max voter weight plugin
  }

  async calculateVoterWeight(
    voter: PublicKey,
    realm: PublicKey,
    mint: PublicKey,
  ): Promise<BN | null> {
    try {
      const bonkRegistrarAddress = bonkRegistrarKey(
        realm,
        mint,
        this.program.programId,
      )
      const bonkRegistrar =
        await this.program.account.registrar.fetch(bonkRegistrarAddress)

      const tokenVoterAddress = tokenVoterKey(
        realm,
        mint,
        voter,
        this.tokenPlugin.programId,
      )[0]
      const tokenVoterAccount =
        await this.tokenPlugin.account.voter.fetch(tokenVoterAddress)
      const depositedTokens =
        tokenVoterAccount.deposits[0].amountDepositedNative
      const activeSdrs = await this.fetchSdrs(voter, bonkRegistrar.stakePool)
      const sdrBalance = activeSdrs.reduce(
        (a, b) => a.add(b.account.depositAmount),
        new BN(0),
      )
      return depositedTokens.add(sdrBalance)
    } catch (e) {
      console.log(e)
      return null
    }
  }

  async updateVoterWeightRecord(
    voter: PublicKey,
    realm: PublicKey,
    mint: PublicKey,
    action?: VoterWeightAction,
    //inputRecordCallback?: (() => Promise<PublicKey>) | undefined
  ): Promise<{
    pre: TransactionInstruction[]
    post?: TransactionInstruction[] | undefined
  }> {
    const tokenVwrAddress = tokenVwrKey(
      realm,
      mint,
      voter,
      this.tokenPlugin.programId,
    )[0]
    const bonkVwrAddresss = bonkVwrKey(
      realm,
      mint,
      voter,
      this.program.programId,
    )[0]
    const sdrAddress = bonkSdrKey(bonkVwrAddresss, this.program.programId)[0]
    const bonkRegistrarAddress = bonkRegistrarKey(
      realm,
      mint,
      this.program.programId,
    )
    const bonkRegistrar =
      await this.program.account.registrar.fetch(bonkRegistrarAddress)
    const tokenOwnerRecord = await getTokenOwnerRecordAddress(
      bonkRegistrar.governanceProgramId,
      realm,
      mint,
      voter,
    )

    const proposal = Keypair.generate().publicKey
    const governance = Keypair.generate().publicKey

    const activeSdrs = await this.fetchSdrs(voter, bonkRegistrar.stakePool)
    const remainingAccounts = activeSdrs.map((sdr) => ({
      pubkey: sdr.publicKey,
      isWritable: false,
      isSigner: false,
    }))

    const bonkUpdateIx = await this.program.methods
      .updateVoterWeightRecord(activeSdrs.length, proposal, {
        createProposal: {},
      })
      .accounts({
        registrar: bonkRegistrarAddress,
        voterWeightRecord: bonkVwrAddresss,
        inputVoterWeight: tokenVwrAddress,
        governance,
        proposal,
        voterAuthority: voter,
        voterTokenOwnerRecord: tokenOwnerRecord,
        stakeDepositRecord: sdrAddress,
      })
      .remainingAccounts(remainingAccounts)
      .instruction()

    return { pre: [bonkUpdateIx] }
  }

  // NO-OP
  async createMaxVoterWeightRecord(): Promise<TransactionInstruction | null> {
    return null
  }

  // NO-OP
  async updateMaxVoterWeightRecord(): Promise<TransactionInstruction | null> {
    return null
  }

  static async connect(
    provider: Provider,
    programId = new PublicKey(BONK_PLUGIN_PK),
  ) {
    const DEFAULT_TOKEN_VOTER_PROGRAMID = new PublicKey(
      'HA99cuBQCCzZu1zuHN2qBxo2FBo1cxNLwKkdt6Prhy8v',
    )
    const DEFAULT_SPL_STAKING_PROGRAMID = new PublicKey(
      'STAKEkKzbdeKkqzKpLkNQD3SUuLgshDKCD7U8duxAbB',
    )
    return new BonkClient(
      new Program<BonkPlugin>(idl as BonkPlugin, programId, provider),
      new Program<TokenVoter>(
        tokenIdl as TokenVoter,
        DEFAULT_TOKEN_VOTER_PROGRAMID,
        provider,
      ),
      new Program<SplTokenStaking>(
        stakingIdl as SplTokenStaking,
        DEFAULT_SPL_STAKING_PROGRAMID,
        provider,
      ),
    )
  }

  async createVoterWeightRecord(
    voter: PublicKey,
    realm: PublicKey,
    mint: PublicKey,
  ): Promise<TransactionInstruction | null> {
    return null
  }
}