export type SplTokenStaking = {
  version: '0.1.6'
  name: 'spl_token_staking'
  instructions: [
    {
      name: 'initializeStakePool'
      docs: [
        'Create a [StakePool](state::StakePool) and initialize the Mint that will',
        'represent effective stake weight.',
      ]
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
          docs: ['Payer of rent']
        },
        {
          name: 'authority'
          isMut: false
          isSigner: false
          docs: ['Authority that can add rewards pools']
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
          docs: [
            'SPL Token Mint of the underlying token to be deposited for staking',
          ]
        },
        {
          name: 'stakePool'
          isMut: true
          isSigner: false
        },
        {
          name: 'stakeMint'
          isMut: true
          isSigner: false
          docs: ['An SPL token Mint for the effective stake weight token']
        },
        {
          name: 'vault'
          isMut: true
          isSigner: false
          docs: ['An SPL token Account for staging A tokens']
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'rent'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'nonce'
          type: 'u8'
        },
        {
          name: 'maxWeight'
          type: 'u64'
        },
        {
          name: 'minDuration'
          type: 'u64'
        },
        {
          name: 'maxDuration'
          type: 'u64'
        },
      ]
    },
    {
      name: 'updateStakePool'
      accounts: [
        {
          name: 'authority'
          isMut: false
          isSigner: true
          docs: ['Authority that can add rewards pools']
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
          docs: [
            'SPL Token Mint of the underlying token to be deposited for staking',
          ]
        },
        {
          name: 'stakePool'
          isMut: true
          isSigner: false
        },
        {
          name: 'stakeMint'
          isMut: true
          isSigner: false
          docs: ['An SPL token Mint for the effective stake weight token']
        },
        {
          name: 'vault'
          isMut: true
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'rent'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'nonce'
          type: 'u8'
        },
        {
          name: 'maxWeight'
          type: 'u64'
        },
        {
          name: 'minDuration'
          type: 'u64'
        },
        {
          name: 'maxDuration'
          type: 'u64'
        },
      ]
    },
    {
      name: 'addRewardPool'
      docs: [
        'Add a [RewardPool](state::RewardPool) to an existing [StakePool](state::StakePool).',
        '',
        "Can only be invoked by the StakePool's authority.",
      ]
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
          docs: ['Payer of rent']
        },
        {
          name: 'authority'
          isMut: false
          isSigner: true
          docs: ['Authority of the StakePool']
        },
        {
          name: 'rewardMint'
          isMut: false
          isSigner: false
          docs: [
            'SPL Token Mint of the token that will be distributed as rewards',
          ]
        },
        {
          name: 'stakePool'
          isMut: true
          isSigner: false
          docs: ['StakePool where the RewardPool will be added']
        },
        {
          name: 'rewardVault'
          isMut: true
          isSigner: false
          docs: ['An SPL token Account for holding rewards to be claimed']
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'rent'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'index'
          type: 'u8'
        },
      ]
    },
    {
      name: 'deposit'
      docs: [
        "Deposit (aka Stake) a wallet's tokens to the specified [StakePool](state::StakePool).",
        "Depending on the `lockup_duration` and the StakePool's weighting configuration, the",
        'wallet initiating the deposit will receive tokens representing their effective stake',
        '(i.e. deposited amount multiplied by the lockup weight).',
        '',
        'For each RewardPool, the latest amount per effective stake will be recalculated to ensure',
        'the latest accumulated rewards are attributed to all previous depositors and not the deposit',
        'resulting from this instruction.',
        '',
        'A [StakeDepositReceipt](state::StakeDepositReceipt) will be created to track the',
        'lockup duration, effective weight, and claimable rewards.',
        '',
        'Remaining accounts are required: pass the `reward_vault` of each reward pool. These must be',
        'passed in the same order as `StakePool.reward_pools`',
      ]
      accounts: [
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'owner'
          isMut: false
          isSigner: false
          docs: [
            'Owner of the StakeDepositReceipt, which may differ',
            'from the account staking.',
          ]
        },
        {
          name: 'from'
          isMut: true
          isSigner: false
          docs: [
            'Token Account to transfer stake_mint from, to be deposited into the vault',
          ]
        },
        {
          name: 'vault'
          isMut: true
          isSigner: false
          docs: ['Vault of the StakePool token will be transfer to']
        },
        {
          name: 'stakeMint'
          isMut: true
          isSigner: false
        },
        {
          name: 'destination'
          isMut: true
          isSigner: false
          isOptional: true
          docs: ['Token account the StakePool token will be transfered to']
        },
        {
          name: 'stakePool'
          isMut: true
          isSigner: false
          docs: ['StakePool owning the vault that will receive the deposit']
        },
        {
          name: 'stakeDepositReceipt'
          isMut: true
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'rent'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'nonce'
          type: 'u32'
        },
        {
          name: 'amount'
          type: 'u64'
        },
        {
          name: 'lockupDuration'
          type: 'u64'
        },
      ]
    },
    {
      name: 'claimAll'
      docs: [
        'Claim unclaimed rewards from all RewardPools for a specific StakeDepositReceipt.',
        '',
        'For each RewardPool, the latest amount per effective stake will be recalculated to ensure',
        'the latest accumulated rewards are accounted for in the claimable amount. The StakeDepositReceipt',
        'is also updated so that the latest claimed amount is equivalent, so that their claimable amount',
        'is 0 after invoking the claim instruction.',
      ]
      accounts: [
        {
          name: 'claimBase'
          accounts: [
            {
              name: 'owner'
              isMut: true
              isSigner: true
              docs: ['Owner of the StakeDepositReceipt']
            },
            {
              name: 'stakePool'
              isMut: true
              isSigner: false
            },
            {
              name: 'stakeDepositReceipt'
              isMut: true
              isSigner: false
              docs: [
                'StakeDepositReceipt of the owner that will be used to claim respective rewards',
              ]
            },
            {
              name: 'tokenProgram'
              isMut: false
              isSigner: false
            },
          ]
        },
      ]
      args: []
    },
    {
      name: 'withdraw'
      docs: [
        "Withdraw (aka Unstake) a wallet's tokens for a specific StakeDepositReceipt. The StakePool's",
        'total weighted stake will be decreased by the effective stake amount of the StakeDepositReceipt',
        'and the original amount deposited will be transferred out of the vault.',
        '',
        'All rewards will be claimed. So, for each RewardPool, the latest amount per effective stake will',
        'be recalculated to ensure the latest accumulated rewards are accounted for in the claimable amount.',
        'The StakeDepositReceipt is also updated so that the latest claimed amount is equivalent, so that',
        'their claimable amount is 0 after invoking the withdraw instruction.',
        '',
        'StakeDepositReceipt account is closed after this instruction.',
        '',
        'Remaining accounts are required: pass the `reward_vault` of each reward pool. These must be',
        'passed in the same order as `StakePool.reward_pools`. The owner (the token account which',
        'gains the withdrawn funds) must also be passed be, in pairs like so:',
        '* `\u003Creward_vault[0]\u003E\u003Cowner[0]\u003E`',
        '* `\u003Creward_vault[1]\u003E\u003Cowner[1]\u003E',
        '* ...etc',
      ]
      accounts: [
        {
          name: 'claimBase'
          accounts: [
            {
              name: 'owner'
              isMut: true
              isSigner: true
              docs: ['Owner of the StakeDepositReceipt']
            },
            {
              name: 'stakePool'
              isMut: true
              isSigner: false
            },
            {
              name: 'stakeDepositReceipt'
              isMut: true
              isSigner: false
              docs: [
                'StakeDepositReceipt of the owner that will be used to claim respective rewards',
              ]
            },
            {
              name: 'tokenProgram'
              isMut: false
              isSigner: false
            },
          ]
        },
        {
          name: 'vault'
          isMut: true
          isSigner: false
          docs: ['Vault of the StakePool token will be transferred from']
        },
        {
          name: 'stakeMint'
          isMut: true
          isSigner: false
          docs: ['stake_mint of StakePool that will be burned']
        },
        {
          name: 'from'
          isMut: true
          isSigner: false
          isOptional: true
          docs: [
            'Token Account holding weighted stake representation token to burn',
          ]
        },
        {
          name: 'destination'
          isMut: true
          isSigner: false
          docs: ['Token account to transfer the previously staked token to']
        },
      ]
      args: []
    },
    {
      name: 'updateTokenMeta'
      accounts: [
        {
          name: 'authority'
          isMut: false
          isSigner: true
        },
        {
          name: 'metadataAccount'
          isMut: true
          isSigner: false
        },
        {
          name: 'stakePool'
          isMut: false
          isSigner: false
        },
        {
          name: 'stakeMint'
          isMut: false
          isSigner: false
        },
        {
          name: 'metadataProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'rent'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'name'
          type: 'string'
        },
        {
          name: 'symbol'
          type: 'string'
        },
        {
          name: 'uri'
          type: 'string'
        },
      ]
    },
    {
      name: 'initializeExpiredRewardPool'
      docs: [
        'Creates a pool for expired stake reward tokens.',
        'Only can be initialized by the original stake pool authority.',
      ]
      accounts: [
        {
          name: 'authority'
          isMut: true
          isSigner: true
          docs: ['Authority that can add rewards pools']
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
          docs: ['SPL Token Mint of the original stake pool']
        },
        {
          name: 'rewardMint'
          isMut: false
          isSigner: false
          docs: ['SPL Token Mint of the original stake pool']
        },
        {
          name: 'expiredRewardPool'
          isMut: true
          isSigner: false
        },
        {
          name: 'expiredRewardVault'
          isMut: true
          isSigner: false
          docs: ['An SPL token Account for expired reward pool']
        },
        {
          name: 'stakePool'
          isMut: true
          isSigner: false
          docs: [
            'authority must be signer who has authority over the stake pool',
          ]
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'rent'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'nonce'
          type: 'u8'
        },
      ]
    },
    {
      name: 'moveToExpiredPool'
      docs: [
        "This takes a stake's reward tokens and moves them into an expired reward pool.",
        'It updates the StakeDepositReceipt to set the effective stake to 0 (no more rewards)',
        'It uses the 9th element of the claimed_amounts vec to store the claimable rewards amount',
        'The function remove the weighted stake amount of the receipt from the total weighted stake in the stake pool',
        'This makes it effectively unstaked and not accruing rewards anymore.',
      ]
      accounts: [
        {
          name: 'authority'
          isMut: true
          isSigner: true
          docs: ['Authority that can add rewards pools']
        },
        {
          name: 'stakeDepositReceipt'
          isMut: true
          isSigner: false
        },
        {
          name: 'owner'
          isMut: true
          isSigner: false
        },
        {
          name: 'expiredRewardPool'
          isMut: true
          isSigner: false
        },
        {
          name: 'expiredRewardVault'
          isMut: true
          isSigner: false
          docs: ['An SPL token Account for expired rewards pool']
        },
        {
          name: 'stakePool'
          isMut: true
          isSigner: false
          docs: [
            'authority must be signer who has authority over the stake pool',
          ]
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'rent'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: []
    },
    {
      name: 'withdrawStakeAndExpiredRewards'
      docs: [
        'This allows an owner of a StakedDepositReceipt to withdraw both their original staked tokens and',
        'their accumulated rewards stored in the expired pool.',
      ]
      accounts: [
        {
          name: 'authority'
          isMut: true
          isSigner: false
        },
        {
          name: 'owner'
          isMut: true
          isSigner: true
          docs: ['Owner of the StakeDepositReceipt']
        },
        {
          name: 'stakeDepositReceipt'
          isMut: true
          isSigner: false
        },
        {
          name: 'expiredRewardPool'
          isMut: true
          isSigner: false
        },
        {
          name: 'stakePool'
          isMut: true
          isSigner: false
        },
        {
          name: 'vault'
          isMut: true
          isSigner: false
          docs: ['Vault of the StakePool token will be transferred from']
        },
        {
          name: 'expiredRewardVault'
          isMut: true
          isSigner: false
          docs: ['An SPL token Account for unlocked rewards pool']
        },
        {
          name: 'destination'
          isMut: true
          isSigner: false
          docs: ['Token account to transfer the previously staked token to']
        },
        {
          name: 'rewardDestination'
          isMut: true
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'rent'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: []
    },
  ]
  accounts: [
    {
      name: 'ExpiredRewardPool'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'rewardVault'
            docs: ['Token Account to store the rewards']
            type: 'publicKey'
          },
          {
            name: 'authority'
            docs: ['Pubkey that can make updates to ExpiredRewardPool']
            type: 'publicKey'
          },
          {
            name: 'mint'
            docs: ['Mint of the locked token']
            type: 'publicKey'
          },
          {
            name: 'rewardMint'
            docs: ['Mint of the reward token']
            type: 'publicKey'
          },
          {
            name: 'stakePool'
            docs: ['Pubkey of the StakePool']
            type: 'publicKey'
          },
          {
            name: 'bumpSeed'
            docs: ['Bump seed']
            type: 'u8'
          },
          {
            name: 'nonce'
            docs: ['Nonce to derive multiple unlocked pools from same mint']
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'stakePool'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'authority'
            docs: ['Pubkey that can make updates to StakePool']
            type: 'publicKey'
          },
          {
            name: 'totalWeightedStake'
            docs: [
              'Total amount staked that accounts for the lock up period weighting.\n    Note, this is not equal to the amount of SPL Tokens staked.',
            ]
            type: 'u128'
          },
          {
            name: 'vault'
            docs: ['Token Account to store the staked SPL Token']
            type: 'publicKey'
          },
          {
            name: 'mint'
            docs: ['Mint of the token being staked']
            type: 'publicKey'
          },
          {
            name: 'stakeMint'
            docs: ['Mint of the token representing effective stake']
            type: 'publicKey'
          },
          {
            name: 'rewardPools'
            docs: [
              'Array of RewardPools that apply to the stake pool.',
              'Unused entries are Pubkey default. In arbitrary order, and may have gaps.',
            ]
            type: {
              array: [
                {
                  defined: 'RewardPool'
                },
                10,
              ]
            }
          },
          {
            name: 'baseWeight'
            docs: [
              'The minimum weight received for staking. In terms of 1 / SCALE_FACTOR_BASE.',
              'Examples:',
              '* `min_weight = 1 x SCALE_FACTOR_BASE` = minmum of 1x multiplier for \u003E min_duration staking',
              '* `min_weight = 2 x SCALE_FACTOR_BASE` = minmum of 2x multiplier for \u003E min_duration staking',
            ]
            type: 'u64'
          },
          {
            name: 'maxWeight'
            docs: [
              'Maximum weight for staking lockup (i.e. weight multiplier when locked',
              'up for max duration). In terms of 1 / SCALE_FACTOR_BASE. Examples:',
              '* A `max_weight = 1 x SCALE_FACTOR_BASE` = 1x multiplier for max staking duration',
              '* A `max_weight = 2 x SCALE_FACTOR_BASE` = 2x multiplier for max staking duration',
            ]
            type: 'u64'
          },
          {
            name: 'minDuration'
            docs: [
              'Minimum duration for lockup. At this point, the staker would receive the base weight. In seconds.',
            ]
            type: 'u64'
          },
          {
            name: 'maxDuration'
            docs: [
              'Maximum duration for lockup. At this point, the staker would receive the max weight. In seconds.',
            ]
            type: 'u64'
          },
          {
            name: 'nonce'
            docs: ['Nonce to derive multiple stake pools from same mint']
            type: 'u8'
          },
          {
            name: 'bumpSeed'
            docs: ['Bump seed for stake_mint']
            type: 'u8'
          },
          {
            name: 'padding0'
            type: {
              array: ['u8', 6]
            }
          },
          {
            name: 'reserved0'
            type: {
              array: ['u8', 8]
            }
          },
        ]
      }
    },
    {
      name: 'stakeDepositReceipt'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'owner'
            docs: ['Pubkey that owns the staked assets']
            type: 'publicKey'
          },
          {
            name: 'payer'
            docs: ['Pubkey that paid for the deposit']
            type: 'publicKey'
          },
          {
            name: 'stakePool'
            docs: ['StakePool the deposit is for']
            type: 'publicKey'
          },
          {
            name: 'lockupDuration'
            docs: ['Duration of the lockup period in seconds']
            type: 'u64'
          },
          {
            name: 'depositTimestamp'
            docs: ['Timestamp in seconds of when the stake lockup began']
            type: 'i64'
          },
          {
            name: 'depositAmount'
            docs: ['Amount of SPL token deposited']
            type: 'u64'
          },
          {
            name: 'effectiveStake'
            docs: ['Amount of stake weighted by lockup duration.']
            type: 'u128'
          },
          {
            name: 'claimedAmounts'
            docs: [
              'The amount per reward that has been claimed or perceived to be claimed. Indexes align with',
              'the StakedPool reward_pools property.',
            ]
            type: {
              array: ['u128', 10]
            }
          },
        ]
      }
    },
  ]
  types: [
    {
      name: 'RewardPool'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'rewardVault'
            docs: ['Token Account to store the reward SPL Token']
            type: 'publicKey'
          },
          {
            name: 'rewardsPerEffectiveStake'
            docs: [
              'Ever increasing accumulator of the amount of rewards per effective stake.\n    Said another way, if a user deposited before any rewards were added to the\n    `vault`, then this would be the token amount per effective stake they could\n    claim.',
            ]
            type: 'u128'
          },
          {
            name: 'lastAmount'
            docs: ['latest amount of tokens in the vault']
            type: 'u64'
          },
          {
            name: 'padding0'
            type: {
              array: ['u8', 8]
            }
          },
        ]
      }
    },
  ]
  errors: [
    {
      code: 6000
      name: 'InvalidAuthority'
      msg: 'Invalid StakePool authority'
    },
    {
      code: 6001
      name: 'RewardPoolIndexOccupied'
      msg: 'RewardPool index is already occupied'
    },
    {
      code: 6002
      name: 'InvalidStakePoolVault'
      msg: 'StakePool vault is invalid'
    },
    {
      code: 6003
      name: 'InvalidRewardPoolVault'
      msg: 'RewardPool vault is invalid'
    },
    {
      code: 6004
      name: 'InvalidRewardPoolVaultIndex'
      msg: 'Invalid RewardPool vault remaining account index'
    },
    {
      code: 6005
      name: 'InvalidOwner'
      msg: 'Invalid StakeDepositReceiptOwner'
    },
    {
      code: 6006
      name: 'InvalidStakePool'
      msg: 'Invalid StakePool'
    },
    {
      code: 6007
      name: 'PrecisionMath'
      msg: 'Math precision error'
    },
    {
      code: 6008
      name: 'InvalidStakeMint'
      msg: 'Invalid stake mint'
    },
    {
      code: 6009
      name: 'StakeStillLocked'
      msg: 'Stake is still locked'
    },
    {
      code: 6010
      name: 'InvalidStakePoolDuration'
      msg: 'Max duration must be great than min'
    },
    {
      code: 6011
      name: 'InvalidStakePoolWeight'
      msg: 'Max weight must be great than min'
    },
    {
      code: 6012
      name: 'DurationTooShort'
      msg: 'Duration too short'
    },
    {
      code: 6013
      name: 'AlreadyMoved'
      msg: 'Rewards already moved'
    },
    {
      code: 6014
      name: 'NotMoved'
      msg: 'Rewards not moved'
    },
    {
      code: 6015
      name: 'InvalidStakeMintDestination'
      msg: 'Invalid stake mint destination'
    },
  ]
}

export const stakingIdl: SplTokenStaking = {
  version: '0.1.6',
  name: 'spl_token_staking',
  instructions: [
    {
      name: 'initializeStakePool',
      docs: [
        'Create a [StakePool](state::StakePool) and initialize the Mint that will',
        'represent effective stake weight.',
      ],
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
          docs: ['Payer of rent'],
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: false,
          docs: ['Authority that can add rewards pools'],
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
          docs: [
            'SPL Token Mint of the underlying token to be deposited for staking',
          ],
        },
        {
          name: 'stakePool',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'stakeMint',
          isMut: true,
          isSigner: false,
          docs: ['An SPL token Mint for the effective stake weight token'],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ['An SPL token Account for staging A tokens'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'nonce',
          type: 'u8',
        },
        {
          name: 'maxWeight',
          type: 'u64',
        },
        {
          name: 'minDuration',
          type: 'u64',
        },
        {
          name: 'maxDuration',
          type: 'u64',
        },
      ],
    },
    {
      name: 'updateStakePool',
      accounts: [
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
          docs: ['Authority that can add rewards pools'],
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
          docs: [
            'SPL Token Mint of the underlying token to be deposited for staking',
          ],
        },
        {
          name: 'stakePool',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'stakeMint',
          isMut: true,
          isSigner: false,
          docs: ['An SPL token Mint for the effective stake weight token'],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'nonce',
          type: 'u8',
        },
        {
          name: 'maxWeight',
          type: 'u64',
        },
        {
          name: 'minDuration',
          type: 'u64',
        },
        {
          name: 'maxDuration',
          type: 'u64',
        },
      ],
    },
    {
      name: 'addRewardPool',
      docs: [
        'Add a [RewardPool](state::RewardPool) to an existing [StakePool](state::StakePool).',
        '',
        "Can only be invoked by the StakePool's authority.",
      ],
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
          docs: ['Payer of rent'],
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
          docs: ['Authority of the StakePool'],
        },
        {
          name: 'rewardMint',
          isMut: false,
          isSigner: false,
          docs: [
            'SPL Token Mint of the token that will be distributed as rewards',
          ],
        },
        {
          name: 'stakePool',
          isMut: true,
          isSigner: false,
          docs: ['StakePool where the RewardPool will be added'],
        },
        {
          name: 'rewardVault',
          isMut: true,
          isSigner: false,
          docs: ['An SPL token Account for holding rewards to be claimed'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'index',
          type: 'u8',
        },
      ],
    },
    {
      name: 'deposit',
      docs: [
        "Deposit (aka Stake) a wallet's tokens to the specified [StakePool](state::StakePool).",
        "Depending on the `lockup_duration` and the StakePool's weighting configuration, the",
        'wallet initiating the deposit will receive tokens representing their effective stake',
        '(i.e. deposited amount multiplied by the lockup weight).',
        '',
        'For each RewardPool, the latest amount per effective stake will be recalculated to ensure',
        'the latest accumulated rewards are attributed to all previous depositors and not the deposit',
        'resulting from this instruction.',
        '',
        'A [StakeDepositReceipt](state::StakeDepositReceipt) will be created to track the',
        'lockup duration, effective weight, and claimable rewards.',
        '',
        'Remaining accounts are required: pass the `reward_vault` of each reward pool. These must be',
        'passed in the same order as `StakePool.reward_pools`',
      ],
      accounts: [
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'owner',
          isMut: false,
          isSigner: false,
          docs: [
            'Owner of the StakeDepositReceipt, which may differ',
            'from the account staking.',
          ],
        },
        {
          name: 'from',
          isMut: true,
          isSigner: false,
          docs: [
            'Token Account to transfer stake_mint from, to be deposited into the vault',
          ],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ['Vault of the StakePool token will be transfer to'],
        },
        {
          name: 'stakeMint',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'destination',
          isMut: true,
          isSigner: false,
          isOptional: true,
          docs: ['Token account the StakePool token will be transfered to'],
        },
        {
          name: 'stakePool',
          isMut: true,
          isSigner: false,
          docs: ['StakePool owning the vault that will receive the deposit'],
        },
        {
          name: 'stakeDepositReceipt',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'nonce',
          type: 'u32',
        },
        {
          name: 'amount',
          type: 'u64',
        },
        {
          name: 'lockupDuration',
          type: 'u64',
        },
      ],
    },
    {
      name: 'claimAll',
      docs: [
        'Claim unclaimed rewards from all RewardPools for a specific StakeDepositReceipt.',
        '',
        'For each RewardPool, the latest amount per effective stake will be recalculated to ensure',
        'the latest accumulated rewards are accounted for in the claimable amount. The StakeDepositReceipt',
        'is also updated so that the latest claimed amount is equivalent, so that their claimable amount',
        'is 0 after invoking the claim instruction.',
      ],
      accounts: [
        {
          name: 'claimBase',
          accounts: [
            {
              name: 'owner',
              isMut: true,
              isSigner: true,
              docs: ['Owner of the StakeDepositReceipt'],
            },
            {
              name: 'stakePool',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'stakeDepositReceipt',
              isMut: true,
              isSigner: false,
              docs: [
                'StakeDepositReceipt of the owner that will be used to claim respective rewards',
              ],
            },
            {
              name: 'tokenProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
      ],
      args: [],
    },
    {
      name: 'withdraw',
      docs: [
        "Withdraw (aka Unstake) a wallet's tokens for a specific StakeDepositReceipt. The StakePool's",
        'total weighted stake will be decreased by the effective stake amount of the StakeDepositReceipt',
        'and the original amount deposited will be transferred out of the vault.',
        '',
        'All rewards will be claimed. So, for each RewardPool, the latest amount per effective stake will',
        'be recalculated to ensure the latest accumulated rewards are accounted for in the claimable amount.',
        'The StakeDepositReceipt is also updated so that the latest claimed amount is equivalent, so that',
        'their claimable amount is 0 after invoking the withdraw instruction.',
        '',
        'StakeDepositReceipt account is closed after this instruction.',
        '',
        'Remaining accounts are required: pass the `reward_vault` of each reward pool. These must be',
        'passed in the same order as `StakePool.reward_pools`. The owner (the token account which',
        'gains the withdrawn funds) must also be passed be, in pairs like so:',
        '* `\u003Creward_vault[0]\u003E\u003Cowner[0]\u003E`',
        '* `\u003Creward_vault[1]\u003E\u003Cowner[1]\u003E',
        '* ...etc',
      ],
      accounts: [
        {
          name: 'claimBase',
          accounts: [
            {
              name: 'owner',
              isMut: true,
              isSigner: true,
              docs: ['Owner of the StakeDepositReceipt'],
            },
            {
              name: 'stakePool',
              isMut: true,
              isSigner: false,
            },
            {
              name: 'stakeDepositReceipt',
              isMut: true,
              isSigner: false,
              docs: [
                'StakeDepositReceipt of the owner that will be used to claim respective rewards',
              ],
            },
            {
              name: 'tokenProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ['Vault of the StakePool token will be transferred from'],
        },
        {
          name: 'stakeMint',
          isMut: true,
          isSigner: false,
          docs: ['stake_mint of StakePool that will be burned'],
        },
        {
          name: 'from',
          isMut: true,
          isSigner: false,
          isOptional: true,
          docs: [
            'Token Account holding weighted stake representation token to burn',
          ],
        },
        {
          name: 'destination',
          isMut: true,
          isSigner: false,
          docs: ['Token account to transfer the previously staked token to'],
        },
      ],
      args: [],
    },
    {
      name: 'updateTokenMeta',
      accounts: [
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'metadataAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'stakePool',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'stakeMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'metadataProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'symbol',
          type: 'string',
        },
        {
          name: 'uri',
          type: 'string',
        },
      ],
    },
    {
      name: 'initializeExpiredRewardPool',
      docs: [
        'Creates a pool for expired stake reward tokens.',
        'Only can be initialized by the original stake pool authority.',
      ],
      accounts: [
        {
          name: 'authority',
          isMut: true,
          isSigner: true,
          docs: ['Authority that can add rewards pools'],
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
          docs: ['SPL Token Mint of the original stake pool'],
        },
        {
          name: 'rewardMint',
          isMut: false,
          isSigner: false,
          docs: ['SPL Token Mint of the original stake pool'],
        },
        {
          name: 'expiredRewardPool',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'expiredRewardVault',
          isMut: true,
          isSigner: false,
          docs: ['An SPL token Account for expired reward pool'],
        },
        {
          name: 'stakePool',
          isMut: true,
          isSigner: false,
          docs: [
            'authority must be signer who has authority over the stake pool',
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'nonce',
          type: 'u8',
        },
      ],
    },
    {
      name: 'moveToExpiredPool',
      docs: [
        "This takes a stake's reward tokens and moves them into an expired reward pool.",
        'It updates the StakeDepositReceipt to set the effective stake to 0 (no more rewards)',
        'It uses the 9th element of the claimed_amounts vec to store the claimable rewards amount',
        'The function remove the weighted stake amount of the receipt from the total weighted stake in the stake pool',
        'This makes it effectively unstaked and not accruing rewards anymore.',
      ],
      accounts: [
        {
          name: 'authority',
          isMut: true,
          isSigner: true,
          docs: ['Authority that can add rewards pools'],
        },
        {
          name: 'stakeDepositReceipt',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'expiredRewardPool',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'expiredRewardVault',
          isMut: true,
          isSigner: false,
          docs: ['An SPL token Account for expired rewards pool'],
        },
        {
          name: 'stakePool',
          isMut: true,
          isSigner: false,
          docs: [
            'authority must be signer who has authority over the stake pool',
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'withdrawStakeAndExpiredRewards',
      docs: [
        'This allows an owner of a StakedDepositReceipt to withdraw both their original staked tokens and',
        'their accumulated rewards stored in the expired pool.',
      ],
      accounts: [
        {
          name: 'authority',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: true,
          docs: ['Owner of the StakeDepositReceipt'],
        },
        {
          name: 'stakeDepositReceipt',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'expiredRewardPool',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'stakePool',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ['Vault of the StakePool token will be transferred from'],
        },
        {
          name: 'expiredRewardVault',
          isMut: true,
          isSigner: false,
          docs: ['An SPL token Account for unlocked rewards pool'],
        },
        {
          name: 'destination',
          isMut: true,
          isSigner: false,
          docs: ['Token account to transfer the previously staked token to'],
        },
        {
          name: 'rewardDestination',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'ExpiredRewardPool',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'rewardVault',
            docs: ['Token Account to store the rewards'],
            type: 'publicKey',
          },
          {
            name: 'authority',
            docs: ['Pubkey that can make updates to ExpiredRewardPool'],
            type: 'publicKey',
          },
          {
            name: 'mint',
            docs: ['Mint of the locked token'],
            type: 'publicKey',
          },
          {
            name: 'rewardMint',
            docs: ['Mint of the reward token'],
            type: 'publicKey',
          },
          {
            name: 'stakePool',
            docs: ['Pubkey of the StakePool'],
            type: 'publicKey',
          },
          {
            name: 'bumpSeed',
            docs: ['Bump seed'],
            type: 'u8',
          },
          {
            name: 'nonce',
            docs: ['Nonce to derive multiple unlocked pools from same mint'],
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'stakePool',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'authority',
            docs: ['Pubkey that can make updates to StakePool'],
            type: 'publicKey',
          },
          {
            name: 'totalWeightedStake',
            docs: [
              'Total amount staked that accounts for the lock up period weighting.\n    Note, this is not equal to the amount of SPL Tokens staked.',
            ],
            type: 'u128',
          },
          {
            name: 'vault',
            docs: ['Token Account to store the staked SPL Token'],
            type: 'publicKey',
          },
          {
            name: 'mint',
            docs: ['Mint of the token being staked'],
            type: 'publicKey',
          },
          {
            name: 'stakeMint',
            docs: ['Mint of the token representing effective stake'],
            type: 'publicKey',
          },
          {
            name: 'rewardPools',
            docs: [
              'Array of RewardPools that apply to the stake pool.',
              'Unused entries are Pubkey default. In arbitrary order, and may have gaps.',
            ],
            type: {
              array: [
                {
                  defined: 'RewardPool',
                },
                10,
              ],
            },
          },
          {
            name: 'baseWeight',
            docs: [
              'The minimum weight received for staking. In terms of 1 / SCALE_FACTOR_BASE.',
              'Examples:',
              '* `min_weight = 1 x SCALE_FACTOR_BASE` = minmum of 1x multiplier for \u003E min_duration staking',
              '* `min_weight = 2 x SCALE_FACTOR_BASE` = minmum of 2x multiplier for \u003E min_duration staking',
            ],
            type: 'u64',
          },
          {
            name: 'maxWeight',
            docs: [
              'Maximum weight for staking lockup (i.e. weight multiplier when locked',
              'up for max duration). In terms of 1 / SCALE_FACTOR_BASE. Examples:',
              '* A `max_weight = 1 x SCALE_FACTOR_BASE` = 1x multiplier for max staking duration',
              '* A `max_weight = 2 x SCALE_FACTOR_BASE` = 2x multiplier for max staking duration',
            ],
            type: 'u64',
          },
          {
            name: 'minDuration',
            docs: [
              'Minimum duration for lockup. At this point, the staker would receive the base weight. In seconds.',
            ],
            type: 'u64',
          },
          {
            name: 'maxDuration',
            docs: [
              'Maximum duration for lockup. At this point, the staker would receive the max weight. In seconds.',
            ],
            type: 'u64',
          },
          {
            name: 'nonce',
            docs: ['Nonce to derive multiple stake pools from same mint'],
            type: 'u8',
          },
          {
            name: 'bumpSeed',
            docs: ['Bump seed for stake_mint'],
            type: 'u8',
          },
          {
            name: 'padding0',
            type: {
              array: ['u8', 6],
            },
          },
          {
            name: 'reserved0',
            type: {
              array: ['u8', 8],
            },
          },
        ],
      },
    },
    {
      name: 'stakeDepositReceipt',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'owner',
            docs: ['Pubkey that owns the staked assets'],
            type: 'publicKey',
          },
          {
            name: 'payer',
            docs: ['Pubkey that paid for the deposit'],
            type: 'publicKey',
          },
          {
            name: 'stakePool',
            docs: ['StakePool the deposit is for'],
            type: 'publicKey',
          },
          {
            name: 'lockupDuration',
            docs: ['Duration of the lockup period in seconds'],
            type: 'u64',
          },
          {
            name: 'depositTimestamp',
            docs: ['Timestamp in seconds of when the stake lockup began'],
            type: 'i64',
          },
          {
            name: 'depositAmount',
            docs: ['Amount of SPL token deposited'],
            type: 'u64',
          },
          {
            name: 'effectiveStake',
            docs: ['Amount of stake weighted by lockup duration.'],
            type: 'u128',
          },
          {
            name: 'claimedAmounts',
            docs: [
              'The amount per reward that has been claimed or perceived to be claimed. Indexes align with',
              'the StakedPool reward_pools property.',
            ],
            type: {
              array: ['u128', 10],
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'RewardPool',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'rewardVault',
            docs: ['Token Account to store the reward SPL Token'],
            type: 'publicKey',
          },
          {
            name: 'rewardsPerEffectiveStake',
            docs: [
              'Ever increasing accumulator of the amount of rewards per effective stake.\n    Said another way, if a user deposited before any rewards were added to the\n    `vault`, then this would be the token amount per effective stake they could\n    claim.',
            ],
            type: 'u128',
          },
          {
            name: 'lastAmount',
            docs: ['latest amount of tokens in the vault'],
            type: 'u64',
          },
          {
            name: 'padding0',
            type: {
              array: ['u8', 8],
            },
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'InvalidAuthority',
      msg: 'Invalid StakePool authority',
    },
    {
      code: 6001,
      name: 'RewardPoolIndexOccupied',
      msg: 'RewardPool index is already occupied',
    },
    {
      code: 6002,
      name: 'InvalidStakePoolVault',
      msg: 'StakePool vault is invalid',
    },
    {
      code: 6003,
      name: 'InvalidRewardPoolVault',
      msg: 'RewardPool vault is invalid',
    },
    {
      code: 6004,
      name: 'InvalidRewardPoolVaultIndex',
      msg: 'Invalid RewardPool vault remaining account index',
    },
    {
      code: 6005,
      name: 'InvalidOwner',
      msg: 'Invalid StakeDepositReceiptOwner',
    },
    {
      code: 6006,
      name: 'InvalidStakePool',
      msg: 'Invalid StakePool',
    },
    {
      code: 6007,
      name: 'PrecisionMath',
      msg: 'Math precision error',
    },
    {
      code: 6008,
      name: 'InvalidStakeMint',
      msg: 'Invalid stake mint',
    },
    {
      code: 6009,
      name: 'StakeStillLocked',
      msg: 'Stake is still locked',
    },
    {
      code: 6010,
      name: 'InvalidStakePoolDuration',
      msg: 'Max duration must be great than min',
    },
    {
      code: 6011,
      name: 'InvalidStakePoolWeight',
      msg: 'Max weight must be great than min',
    },
    {
      code: 6012,
      name: 'DurationTooShort',
      msg: 'Duration too short',
    },
    {
      code: 6013,
      name: 'AlreadyMoved',
      msg: 'Rewards already moved',
    },
    {
      code: 6014,
      name: 'NotMoved',
      msg: 'Rewards not moved',
    },
    {
      code: 6015,
      name: 'InvalidStakeMintDestination',
      msg: 'Invalid stake mint destination',
    },
  ],
}
