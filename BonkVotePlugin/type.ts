export type BonkPlugin = {
  version: '0.1.0'
  name: 'bonk_plugin'
  constants: [
    {
      name: 'SPL_TOKEN_STAKING_PROGRAM_ID'
      type: 'publicKey'
      value: 'STAKEkKzbdeKkqzKpLkNQD3SUuLgshDKCD7U8duxAbB'
    },
  ]
  instructions: [
    {
      name: 'createRegistrar'
      accounts: [
        {
          name: 'registrar'
          isMut: true
          isSigner: false
        },
        {
          name: 'governanceProgramId'
          isMut: false
          isSigner: false
        },
        {
          name: 'previousVoterWeightPluginProgramId'
          isMut: false
          isSigner: false
          isOptional: true
        },
        {
          name: 'realm'
          isMut: false
          isSigner: false
        },
        {
          name: 'stakePool'
          isMut: false
          isSigner: false
        },
        {
          name: 'governingTokenMint'
          isMut: false
          isSigner: false
        },
        {
          name: 'realmAuthority'
          isMut: false
          isSigner: true
        },
        {
          name: 'payer'
          isMut: true
          isSigner: true
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
      name: 'createVoterWeightRecord'
      accounts: [
        {
          name: 'registrar'
          isMut: false
          isSigner: false
        },
        {
          name: 'voterWeightRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'stakeDepositRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'governingTokenOwner'
          type: 'publicKey'
        },
      ]
    },
    {
      name: 'updateVoterWeightRecord'
      accounts: [
        {
          name: 'registrar'
          isMut: false
          isSigner: false
        },
        {
          name: 'inputVoterWeight'
          isMut: false
          isSigner: false
          docs: [
            'An account that is either of type TokenOwnerRecordV2 or VoterWeightRecord',
            'depending on whether the registrar includes a predecessor or not',
          ]
        },
        {
          name: 'voterWeightRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'stakeDepositRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'voterTokenOwnerRecord'
          isMut: false
          isSigner: false
        },
        {
          name: 'governance'
          isMut: false
          isSigner: false
        },
        {
          name: 'proposal'
          isMut: false
          isSigner: false
          isOptional: true
        },
        {
          name: 'voterAuthority'
          isMut: false
          isSigner: true
        },
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'stakeReceiptsCount'
          type: 'u8'
        },
        {
          name: 'actionTarget'
          type: 'publicKey'
        },
        {
          name: 'action'
          type: {
            defined: 'VoterWeightAction'
          }
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'registrar'
      docs: [
        'Registrar which stores Token Voting configuration for the given Realm',
      ]
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'governanceProgramId'
            type: 'publicKey'
          },
          {
            name: 'realm'
            type: 'publicKey'
          },
          {
            name: 'realmAuthority'
            type: 'publicKey'
          },
          {
            name: 'governingTokenMint'
            type: 'publicKey'
          },
          {
            name: 'stakePool'
            type: 'publicKey'
          },
          {
            name: 'previousVoterWeightPluginProgramId'
            type: {
              option: 'publicKey'
            }
          },
          {
            name: 'reserved'
            type: {
              array: ['u8', 8]
            }
          },
        ]
      }
    },
    {
      name: 'stakeDepositRecord'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'deposits'
            type: {
              vec: 'publicKey'
            }
          },
          {
            name: 'weightActionTarget'
            type: {
              option: 'publicKey'
            }
          },
          {
            name: 'weightAction'
            type: {
              option: {
                defined: 'VoterWeightAction'
              }
            }
          },
          {
            name: 'depositsLen'
            type: 'u8'
          },
          {
            name: 'bump'
            type: 'u8'
          },
          {
            name: 'previousVoterWeight'
            type: 'u64'
          },
        ]
      }
    },
    {
      name: 'voterWeightRecord'
      docs: [
        'VoterWeightRecord account as defined in spl-governance-addin-api',
        "It's redefined here without account_discriminator for Anchor to treat it as native account",
        '',
        'The account is used as an api interface to provide voting power to the governance program from external addin contracts',
      ]
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'realm'
            type: 'publicKey'
          },
          {
            name: 'governingTokenMint'
            type: 'publicKey'
          },
          {
            name: 'governingTokenOwner'
            type: 'publicKey'
          },
          {
            name: 'voterWeight'
            type: 'u64'
          },
          {
            name: 'voterWeightExpiry'
            type: {
              option: 'u64'
            }
          },
          {
            name: 'weightAction'
            type: {
              option: {
                defined: 'VoterWeightAction'
              }
            }
          },
          {
            name: 'weightActionTarget'
            type: {
              option: 'publicKey'
            }
          },
          {
            name: 'reserved'
            type: {
              array: ['u8', 8]
            }
          },
        ]
      }
    },
  ]
  types: [
    {
      name: 'VoterWeightAction'
      docs: [
        'VoterWeightAction enum as defined in spl-governance-addin-api',
        "It's redefined here for Anchor to export it to IDL",
      ]
      type: {
        kind: 'enum'
        variants: [
          {
            name: 'CastVote'
          },
          {
            name: 'CommentProposal'
          },
          {
            name: 'CreateGovernance'
          },
          {
            name: 'CreateProposal'
          },
          {
            name: 'SignOffProposal'
          },
        ]
      }
    },
  ]
  errors: [
    {
      code: 6000
      name: 'InvalidRealmAuthority'
      msg: 'Invalid Realm Authority'
    },
    {
      code: 6001
      name: 'InvalidGoverningToken'
      msg: 'The mint of the stake pool is different from the realm'
    },
    {
      code: 6002
      name: 'InvalidVoterWeightRecordRealm'
      msg: 'Invalid VoterWeightRecord Realm'
    },
    {
      code: 6003
      name: 'InvalidVoterWeightRecordMint'
      msg: 'Invalid VoterWeightRecord Mint'
    },
    {
      code: 6004
      name: 'InvalidStakePool'
      msg: 'Invalid Stake Pool'
    },
    {
      code: 6005
      name: 'InvalidTokenOwnerForVoterWeightRecord'
      msg: 'Invalid TokenOwner for VoterWeightRecord'
    },
    {
      code: 6006
      name: 'VoterDoesNotOwnDepositReceipt'
      msg: 'The owner of the receipt does not match'
    },
    {
      code: 6007
      name: 'DuplicatedReceiptDetected'
      msg: 'The deposit receipt was already provided'
    },
    {
      code: 6008
      name: 'ExpiredStakeDepositReceipt'
      msg: 'The stake deposit receipt has already expired'
    },
    {
      code: 6009
      name: 'InvalidStakeDuration'
      msg: 'The stake deposit receipt will expire before proposal'
    },
    {
      code: 6010
      name: 'ReceiptsCountMismatch'
      msg: 'The stake deposit receipts count does not match'
    },
    {
      code: 6011
      name: 'ProposalAccountIsRequired'
      msg: 'Proposal account is required for Cast Vote action'
    },
    {
      code: 6012
      name: 'ActionTargetMismatch'
      msg: 'Action target is different from the public key of the proposal'
    },
    {
      code: 6013
      name: 'MaximumDepositsReached'
      msg: 'Maximum deposits length reached'
    },
  ]
}

export const IDL: BonkPlugin = {
  version: '0.1.0',
  name: 'bonk_plugin',
  constants: [
    {
      name: 'SPL_TOKEN_STAKING_PROGRAM_ID',
      type: 'publicKey',
      value: 'STAKEkKzbdeKkqzKpLkNQD3SUuLgshDKCD7U8duxAbB',
    },
  ],
  instructions: [
    {
      name: 'createRegistrar',
      accounts: [
        {
          name: 'registrar',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'governanceProgramId',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'previousVoterWeightPluginProgramId',
          isMut: false,
          isSigner: false,
          isOptional: true,
        },
        {
          name: 'realm',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'stakePool',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'governingTokenMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'realmAuthority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
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
      name: 'createVoterWeightRecord',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'voterWeightRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'stakeDepositRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'governingTokenOwner',
          type: 'publicKey',
        },
      ],
    },
    {
      name: 'updateVoterWeightRecord',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'inputVoterWeight',
          isMut: false,
          isSigner: false,
          docs: [
            'An account that is either of type TokenOwnerRecordV2 or VoterWeightRecord',
            'depending on whether the registrar includes a predecessor or not',
          ],
        },
        {
          name: 'voterWeightRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'stakeDepositRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'voterTokenOwnerRecord',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'governance',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'proposal',
          isMut: false,
          isSigner: false,
          isOptional: true,
        },
        {
          name: 'voterAuthority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'stakeReceiptsCount',
          type: 'u8',
        },
        {
          name: 'actionTarget',
          type: 'publicKey',
        },
        {
          name: 'action',
          type: {
            defined: 'VoterWeightAction',
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'registrar',
      docs: [
        'Registrar which stores Token Voting configuration for the given Realm',
      ],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'governanceProgramId',
            type: 'publicKey',
          },
          {
            name: 'realm',
            type: 'publicKey',
          },
          {
            name: 'realmAuthority',
            type: 'publicKey',
          },
          {
            name: 'governingTokenMint',
            type: 'publicKey',
          },
          {
            name: 'stakePool',
            type: 'publicKey',
          },
          {
            name: 'previousVoterWeightPluginProgramId',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'reserved',
            type: {
              array: ['u8', 8],
            },
          },
        ],
      },
    },
    {
      name: 'stakeDepositRecord',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'deposits',
            type: {
              vec: 'publicKey',
            },
          },
          {
            name: 'weightActionTarget',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'weightAction',
            type: {
              option: {
                defined: 'VoterWeightAction',
              },
            },
          },
          {
            name: 'depositsLen',
            type: 'u8',
          },
          {
            name: 'bump',
            type: 'u8',
          },
          {
            name: 'previousVoterWeight',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'voterWeightRecord',
      docs: [
        'VoterWeightRecord account as defined in spl-governance-addin-api',
        "It's redefined here without account_discriminator for Anchor to treat it as native account",
        '',
        'The account is used as an api interface to provide voting power to the governance program from external addin contracts',
      ],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'realm',
            type: 'publicKey',
          },
          {
            name: 'governingTokenMint',
            type: 'publicKey',
          },
          {
            name: 'governingTokenOwner',
            type: 'publicKey',
          },
          {
            name: 'voterWeight',
            type: 'u64',
          },
          {
            name: 'voterWeightExpiry',
            type: {
              option: 'u64',
            },
          },
          {
            name: 'weightAction',
            type: {
              option: {
                defined: 'VoterWeightAction',
              },
            },
          },
          {
            name: 'weightActionTarget',
            type: {
              option: 'publicKey',
            },
          },
          {
            name: 'reserved',
            type: {
              array: ['u8', 8],
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'VoterWeightAction',
      docs: [
        'VoterWeightAction enum as defined in spl-governance-addin-api',
        "It's redefined here for Anchor to export it to IDL",
      ],
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'CastVote',
          },
          {
            name: 'CommentProposal',
          },
          {
            name: 'CreateGovernance',
          },
          {
            name: 'CreateProposal',
          },
          {
            name: 'SignOffProposal',
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'InvalidRealmAuthority',
      msg: 'Invalid Realm Authority',
    },
    {
      code: 6001,
      name: 'InvalidGoverningToken',
      msg: 'The mint of the stake pool is different from the realm',
    },
    {
      code: 6002,
      name: 'InvalidVoterWeightRecordRealm',
      msg: 'Invalid VoterWeightRecord Realm',
    },
    {
      code: 6003,
      name: 'InvalidVoterWeightRecordMint',
      msg: 'Invalid VoterWeightRecord Mint',
    },
    {
      code: 6004,
      name: 'InvalidStakePool',
      msg: 'Invalid Stake Pool',
    },
    {
      code: 6005,
      name: 'InvalidTokenOwnerForVoterWeightRecord',
      msg: 'Invalid TokenOwner for VoterWeightRecord',
    },
    {
      code: 6006,
      name: 'VoterDoesNotOwnDepositReceipt',
      msg: 'The owner of the receipt does not match',
    },
    {
      code: 6007,
      name: 'DuplicatedReceiptDetected',
      msg: 'The deposit receipt was already provided',
    },
    {
      code: 6008,
      name: 'ExpiredStakeDepositReceipt',
      msg: 'The stake deposit receipt has already expired',
    },
    {
      code: 6009,
      name: 'InvalidStakeDuration',
      msg: 'The stake deposit receipt will expire before proposal',
    },
    {
      code: 6010,
      name: 'ReceiptsCountMismatch',
      msg: 'The stake deposit receipts count does not match',
    },
    {
      code: 6011,
      name: 'ProposalAccountIsRequired',
      msg: 'Proposal account is required for Cast Vote action',
    },
    {
      code: 6012,
      name: 'ActionTargetMismatch',
      msg: 'Action target is different from the public key of the proposal',
    },
    {
      code: 6013,
      name: 'MaximumDepositsReached',
      msg: 'Maximum deposits length reached',
    },
  ],
}
