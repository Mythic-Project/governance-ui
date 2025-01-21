export type TokenVoter = {
  version: '0.0.1'
  name: 'token_voter'
  address: 'HA99cuBQCCzZu1zuHN2qBxo2FBo1cxNLwKkdt6Prhy8v'
  instructions: [
    {
      name: 'createRegistrar'
      accounts: [
        {
          name: 'registrar'
          isMut: true
          isSigner: false
          docs: [
            'The Realm Voter Registrar',
            'There can only be a single registrar per governance Realm and governing mint of the Realm',
          ]
        },
        {
          name: 'governanceProgramId'
          isMut: false
          isSigner: false
          docs: [
            'The program id of the spl-governance program the realm belongs to',
          ]
        },
        {
          name: 'realm'
          isMut: false
          isSigner: false
          docs: [
            'An spl-governance Realm',
            '',
            'Realm is validated in the instruction:',
            '- Realm is owned by the governance_program_id',
            '- governing_token_mint must be the community or council mint',
            '- realm_authority is realm.authority',
            '',
          ]
        },
        {
          name: 'governingTokenMint'
          isMut: false
          isSigner: false
          docs: [
            'Either the realm community mint or the council mint.',
            'It must match Realm.community_mint or Realm.config.council_mint',
            '',
            'Note: Once the Realm voter plugin is enabled the governing_token_mint is used only as identity',
            'for the voting population and the tokens of that are no longer used',
          ]
        },
        {
          name: 'realmAuthority'
          isMut: false
          isSigner: true
          docs: ['realm_authority must sign and match Realm.authority']
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
          name: 'maxMints'
          type: 'u8'
        },
      ]
    },
    {
      name: 'resizeRegistrar'
      accounts: [
        {
          name: 'registrar'
          isMut: true
          isSigner: false
          docs: [
            'The Realm Voter Registrar',
            'There can only be a single registrar per governance Realm and governing mint of the Realm',
          ]
        },
        {
          name: 'governanceProgramId'
          isMut: false
          isSigner: false
          docs: [
            'The program id of the spl-governance program the realm belongs to',
          ]
        },
        {
          name: 'realm'
          isMut: false
          isSigner: false
          docs: [
            'An spl-governance Realm',
            '',
            'Realm is validated in the instruction:',
            '- Realm is owned by the governance_program_id',
            '- governing_token_mint must be the community or council mint',
            '- realm_authority is realm.authority',
            '',
          ]
        },
        {
          name: 'governingTokenMint'
          isMut: false
          isSigner: false
          docs: [
            'Either the realm community mint or the council mint.',
            'It must match Realm.community_mint or Realm.config.council_mint',
            '',
            'Note: Once the Realm voter plugin is enabled the governing_token_mint is used only as identity',
            'for the voting population and the tokens of that are no longer used',
          ]
        },
        {
          name: 'realmAuthority'
          isMut: false
          isSigner: true
          docs: ['realm_authority must sign and match Realm.authority']
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
          name: 'maxMints'
          type: 'u8'
        },
      ]
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
          name: 'voter'
          isMut: true
          isSigner: false
        },
        {
          name: 'voterWeightRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'voterAuthority'
          isMut: true
          isSigner: true
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'instructions'
          isMut: false
          isSigner: false
        },
      ]
      args: []
    },
    {
      name: 'createMaxVoterWeightRecord'
      accounts: [
        {
          name: 'registrar'
          isMut: false
          isSigner: false
        },
        {
          name: 'maxVoterWeightRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'governanceProgramId'
          isMut: false
          isSigner: false
          docs: [
            'The program id of the spl-governance program the realm belongs to',
          ]
        },
        {
          name: 'realm'
          isMut: false
          isSigner: false
        },
        {
          name: 'realmGoverningTokenMint'
          isMut: false
          isSigner: false
          docs: ['Either the realm community mint or the council mint.']
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
      name: 'configureMintConfig'
      accounts: [
        {
          name: 'registrar'
          isMut: true
          isSigner: false
          docs: [
            'Registrar which we configure the provided spl-governance instance for',
          ]
        },
        {
          name: 'realm'
          isMut: false
          isSigner: false
        },
        {
          name: 'realmAuthority'
          isMut: false
          isSigner: true
          docs: [
            'Authority of the Realm must sign the transaction and must match realm.authority',
          ]
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
          docs: ['Tokens of this mint will be included in the Mint Configs']
        },
        {
          name: 'maxVoterWeightRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'governanceProgramId'
          isMut: false
          isSigner: false
          docs: [
            'The onus is entirely on the caller side to ensure the provided instance is correct',
            'In future versions once we have the registry of spl-governance instances it could be validated against the registry',
          ]
        },
      ]
      args: [
        {
          name: 'digitShift'
          type: 'i8'
        },
      ]
    },
    {
      name: 'deposit'
      accounts: [
        {
          name: 'registrar'
          isMut: false
          isSigner: false
        },
        {
          name: 'voter'
          isMut: true
          isSigner: false
        },
        {
          name: 'vault'
          isMut: true
          isSigner: false
        },
        {
          name: 'voterWeightRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'tokenOwnerRecord'
          isMut: false
          isSigner: false
          docs: [
            'TokenOwnerRecord for any of the configured spl-governance instances',
          ]
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
          docs: [
            'Tokens of this mint must be included in the Voting Mint Configs',
          ]
        },
        {
          name: 'depositToken'
          isMut: true
          isSigner: false
        },
        {
          name: 'depositAuthority'
          isMut: true
          isSigner: true
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'associatedTokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'instructions'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'depositEntryIndex'
          type: 'u8'
        },
        {
          name: 'amount'
          type: 'u64'
        },
      ]
    },
    {
      name: 'withdraw'
      accounts: [
        {
          name: 'registrar'
          isMut: false
          isSigner: false
        },
        {
          name: 'voter'
          isMut: true
          isSigner: false
        },
        {
          name: 'voterAuthority'
          isMut: true
          isSigner: true
        },
        {
          name: 'tokenOwnerRecord'
          isMut: false
          isSigner: false
          docs: [
            'The token_owner_record for the voter_authority. This is needed',
            'to be able to forbid withdraws while the voter is engaged with',
            'a vote or has an open proposal.',
            '',
            '- owned by registrar.governance_program_id',
            '- for the registrar.realm',
            '- for the registrar.realm_governing_token_mint',
            '- governing_token_owner is voter_authority',
          ]
        },
        {
          name: 'mint'
          isMut: false
          isSigner: false
          docs: [
            'Tokens of this mint must be included in the Voting Mint Configs',
          ]
        },
        {
          name: 'voterWeightRecord'
          isMut: true
          isSigner: false
          docs: [
            'Withdraws must update the voter weight record, to prevent a stale',
            'record being used to vote after the withdraw.',
          ]
        },
        {
          name: 'vault'
          isMut: true
          isSigner: false
        },
        {
          name: 'destination'
          isMut: true
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'associatedTokenProgram'
          isMut: false
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: [
        {
          name: 'depositEntryIndex'
          type: 'u8'
        },
        {
          name: 'amount'
          type: 'u64'
        },
      ]
    },
    {
      name: 'closeVoter'
      accounts: [
        {
          name: 'registrar'
          isMut: false
          isSigner: false
        },
        {
          name: 'voter'
          isMut: true
          isSigner: false
        },
        {
          name: 'voterWeightRecord'
          isMut: true
          isSigner: false
        },
        {
          name: 'voterAuthority'
          isMut: false
          isSigner: true
        },
        {
          name: 'solDestination'
          isMut: true
          isSigner: false
        },
        {
          name: 'tokenProgram'
          isMut: false
          isSigner: false
        },
      ]
      args: []
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
            docs: ['spl-governance program the Realm belongs to']
            type: 'publicKey'
          },
          {
            name: 'realm'
            docs: ['Realm of the Registrar']
            type: 'publicKey'
          },
          {
            name: 'governingTokenMint'
            docs: [
              'Governing token mint the Registrar is for',
              'It can either be the Community or the Council mint of the Realm',
              'When the plugin is used the mint is only used as identity of the governing power (voting population)',
              'and the actual token of the mint is not used',
            ]
            type: 'publicKey'
          },
          {
            name: 'votingMintConfigs'
            docs: [
              'Storage for voting mints and their configuration.',
              "The length should be adjusted for one's use case.",
            ]
            type: {
              vec: {
                defined: 'VotingMintConfig'
              }
            }
          },
          {
            name: 'maxMints'
            docs: ['Max mints that voters can create.']
            type: 'u8'
          },
          {
            name: 'reserved'
            docs: ['Reserved for future upgrades']
            type: {
              array: ['u8', 127]
            }
          },
        ]
      }
    },
    {
      name: 'voter'
      docs: ['User account for mint voting rights.']
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'voterAuthority'
            docs: ['Voter Authority who owns the account tokens.']
            type: 'publicKey'
          },
          {
            name: 'registrar'
            docs: ['Registrar in which the voter is created in.']
            type: 'publicKey'
          },
          {
            name: 'deposits'
            docs: ['Deposit entries for a deposit for a given mint.']
            type: {
              vec: {
                defined: 'DepositEntry'
              }
            }
          },
          {
            name: 'voterBump'
            docs: ['Voter account bump.']
            type: 'u8'
          },
          {
            name: 'voterWeightRecordBump'
            docs: ['Voter weight record account bump.']
            type: 'u8'
          },
          {
            name: 'reserved'
            docs: ['Reserved for future upgrades']
            type: {
              array: ['u8', 94]
            }
          },
        ]
      }
    },
  ]
  types: [
    {
      name: 'DepositEntry'
      docs: ['Bookkeeping for a single deposit for a given mint.']
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'amountDepositedNative'
            docs: [
              'Amount in deposited, in native currency.',
              'Withdraws directly reduce this amount.',
              '',
              'This directly tracks the total amount added by the user. They may',
              'never withdraw more than this amount.',
            ]
            type: 'u64'
          },
          {
            name: 'votingMintConfigIdx'
            docs: ['Points to the VotingMintConfig this deposit uses.']
            type: 'u8'
          },
          {
            name: 'depositSlotHash'
            docs: [
              'Deposit slot hash.',
              'saves deposit slot hash so that depositor cannot withdraw at the same slot.',
            ]
            type: 'u64'
          },
          {
            name: 'isUsed'
            type: 'bool'
          },
          {
            name: 'reserved'
            docs: ['Reserved for future upgrades']
            type: {
              array: ['u8', 38]
            }
          },
        ]
      }
    },
    {
      name: 'VotingMintConfig'
      docs: [
        'Exchange rate for an asset that can be used to mint voting rights.',
        '',
        'See documentation of configure_voting_mint for details on how',
        'native token amounts convert to vote weight.',
      ]
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'mint'
            docs: ['Mint for this entry.']
            type: 'publicKey'
          },
          {
            name: 'digitShift'
            docs: [
              'Number of digits to shift native amounts, applying a 10^digit_shift factor.',
            ]
            type: 'i8'
          },
          {
            name: 'mintSupply'
            type: 'u64'
          },
          {
            name: 'reserved1'
            type: {
              array: ['u8', 55]
            }
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
      name: 'InvalidRealmForRegistrar'
      msg: 'Invalid Realm for Registrar'
    },
    {
      code: 6002
      name: 'InvalidMaxVoterWeightRecordRealm'
      msg: 'Invalid MaxVoterWeightRecord Realm'
    },
    {
      code: 6003
      name: 'InvalidMaxVoterWeightRecordMint'
      msg: 'Invalid MaxVoterWeightRecord Mint'
    },
    {
      code: 6004
      name: 'InvalidVoterWeightRecordRealm'
      msg: 'Invalid VoterWeightRecord Realm'
    },
    {
      code: 6005
      name: 'InvalidVoterWeightRecordMint'
      msg: 'Invalid VoterWeightRecord Mint'
    },
    {
      code: 6006
      name: 'InvalidTokenOwnerForVoterWeightRecord'
      msg: 'Invalid TokenOwner for VoterWeightRecord'
    },
    {
      code: 6007
      name: 'Overflow'
      msg: 'Mathematical Overflow'
    },
    {
      code: 6008
      name: 'SplTokenAccountWithInvalidOwner'
      msg: 'Invalid Token account owner'
    },
    {
      code: 6009
      name: 'SplTokenMintWithInvalidOwner'
      msg: 'Invalid Mint account owner'
    },
    {
      code: 6010
      name: 'SplTokenAccountDoesNotExist'
      msg: "Token Account doesn't exist"
    },
    {
      code: 6011
      name: 'SplTokenInvalidTokenAccountData'
      msg: 'Token account data is invalid'
    },
    {
      code: 6012
      name: 'SplTokenInvalidMintAccountData'
      msg: 'Token mint account data is invalid'
    },
    {
      code: 6013
      name: 'SplTokenMintNotInitialized'
      msg: 'Token Mint account is not initialized'
    },
    {
      code: 6014
      name: 'SplTokenMintDoesNotExist'
      msg: "Token Mint account doesn't exist"
    },
    {
      code: 6015
      name: 'InvalidAccountData'
      msg: 'Account Data is empty or invalid'
    },
    {
      code: 6016
      name: 'VoterWeightOverflow'
      msg: 'Math Overflow in VoterWeight'
    },
    {
      code: 6017
      name: 'MintNotFound'
      msg: 'Mint Not Found in Mint Configs'
    },
    {
      code: 6018
      name: 'GoverningTokenOwnerMustMatch'
      msg: 'Governing TokenOwner must match'
    },
    {
      code: 6019
      name: 'InvalidTokenOwnerRecord'
      msg: 'Invalid Token Owner Records'
    },
    {
      code: 6020
      name: 'OutOfBoundsDepositEntryIndex'
      msg: 'Index is out of Deposit Entry bounds'
    },
    {
      code: 6021
      name: 'ForbiddenCpi'
      msg: 'No Cpi Allowed'
    },
    {
      code: 6022
      name: 'VotingTokenNonZero'
      msg: 'Voting Tokens are not withdrawn'
    },
    {
      code: 6023
      name: 'VaultTokenNonZero'
      msg: 'Vault Tokens are not withdrawn'
    },
    {
      code: 6024
      name: 'InvalidAuthority'
      msg: 'Invalid Voter Token Authority'
    },
    {
      code: 6025
      name: 'TokenAmountOverflow'
      msg: 'Math Overflow in Token Amount'
    },
    {
      code: 6026
      name: 'CannotWithdraw'
      msg: 'Cannot Withdraw in the same slot'
    },
    {
      code: 6027
      name: 'InvalidResizeMaxMints'
      msg: 'Resizing Max Mints cannot be smaller than Configure Mint Configs'
    },
    {
      code: 6028
      name: 'MintIndexMismatch'
      msg: 'Mint Index mismatch!'
    },
    {
      code: 6029
      name: 'DepositIndexInactive'
      msg: 'Inactive Deposit Index!'
    },
  ]
}

export const IDL: TokenVoter = {
  version: '0.0.1',
  name: 'token_voter',
  address: 'HA99cuBQCCzZu1zuHN2qBxo2FBo1cxNLwKkdt6Prhy8v',
  instructions: [
    {
      name: 'createRegistrar',
      accounts: [
        {
          name: 'registrar',
          isMut: true,
          isSigner: false,
          docs: [
            'The Realm Voter Registrar',
            'There can only be a single registrar per governance Realm and governing mint of the Realm',
          ],
        },
        {
          name: 'governanceProgramId',
          isMut: false,
          isSigner: false,
          docs: [
            'The program id of the spl-governance program the realm belongs to',
          ],
        },
        {
          name: 'realm',
          isMut: false,
          isSigner: false,
          docs: [
            'An spl-governance Realm',
            '',
            'Realm is validated in the instruction:',
            '- Realm is owned by the governance_program_id',
            '- governing_token_mint must be the community or council mint',
            '- realm_authority is realm.authority',
            '',
          ],
        },
        {
          name: 'governingTokenMint',
          isMut: false,
          isSigner: false,
          docs: [
            'Either the realm community mint or the council mint.',
            'It must match Realm.community_mint or Realm.config.council_mint',
            '',
            'Note: Once the Realm voter plugin is enabled the governing_token_mint is used only as identity',
            'for the voting population and the tokens of that are no longer used',
          ],
        },
        {
          name: 'realmAuthority',
          isMut: false,
          isSigner: true,
          docs: ['realm_authority must sign and match Realm.authority'],
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
          name: 'maxMints',
          type: 'u8',
        },
      ],
    },
    {
      name: 'resizeRegistrar',
      accounts: [
        {
          name: 'registrar',
          isMut: true,
          isSigner: false,
          docs: [
            'The Realm Voter Registrar',
            'There can only be a single registrar per governance Realm and governing mint of the Realm',
          ],
        },
        {
          name: 'governanceProgramId',
          isMut: false,
          isSigner: false,
          docs: [
            'The program id of the spl-governance program the realm belongs to',
          ],
        },
        {
          name: 'realm',
          isMut: false,
          isSigner: false,
          docs: [
            'An spl-governance Realm',
            '',
            'Realm is validated in the instruction:',
            '- Realm is owned by the governance_program_id',
            '- governing_token_mint must be the community or council mint',
            '- realm_authority is realm.authority',
            '',
          ],
        },
        {
          name: 'governingTokenMint',
          isMut: false,
          isSigner: false,
          docs: [
            'Either the realm community mint or the council mint.',
            'It must match Realm.community_mint or Realm.config.council_mint',
            '',
            'Note: Once the Realm voter plugin is enabled the governing_token_mint is used only as identity',
            'for the voting population and the tokens of that are no longer used',
          ],
        },
        {
          name: 'realmAuthority',
          isMut: false,
          isSigner: true,
          docs: ['realm_authority must sign and match Realm.authority'],
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
          name: 'maxMints',
          type: 'u8',
        },
      ],
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
          name: 'voter',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'voterWeightRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'voterAuthority',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'instructions',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: 'createMaxVoterWeightRecord',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'maxVoterWeightRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'governanceProgramId',
          isMut: false,
          isSigner: false,
          docs: [
            'The program id of the spl-governance program the realm belongs to',
          ],
        },
        {
          name: 'realm',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'realmGoverningTokenMint',
          isMut: false,
          isSigner: false,
          docs: ['Either the realm community mint or the council mint.'],
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
      name: 'configureMintConfig',
      accounts: [
        {
          name: 'registrar',
          isMut: true,
          isSigner: false,
          docs: [
            'Registrar which we configure the provided spl-governance instance for',
          ],
        },
        {
          name: 'realm',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'realmAuthority',
          isMut: false,
          isSigner: true,
          docs: [
            'Authority of the Realm must sign the transaction and must match realm.authority',
          ],
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
          docs: ['Tokens of this mint will be included in the Mint Configs'],
        },
        {
          name: 'maxVoterWeightRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'governanceProgramId',
          isMut: false,
          isSigner: false,
          docs: [
            'The onus is entirely on the caller side to ensure the provided instance is correct',
            'In future versions once we have the registry of spl-governance instances it could be validated against the registry',
          ],
        },
      ],
      args: [
        {
          name: 'digitShift',
          type: 'i8',
        },
      ],
    },
    {
      name: 'deposit',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'voter',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'voterWeightRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenOwnerRecord',
          isMut: false,
          isSigner: false,
          docs: [
            'TokenOwnerRecord for any of the configured spl-governance instances',
          ],
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
          docs: [
            'Tokens of this mint must be included in the Voting Mint Configs',
          ],
        },
        {
          name: 'depositToken',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'depositAuthority',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'instructions',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'depositEntryIndex',
          type: 'u8',
        },
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'withdraw',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'voter',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'voterAuthority',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'tokenOwnerRecord',
          isMut: false,
          isSigner: false,
          docs: [
            'The token_owner_record for the voter_authority. This is needed',
            'to be able to forbid withdraws while the voter is engaged with',
            'a vote or has an open proposal.',
            '',
            '- owned by registrar.governance_program_id',
            '- for the registrar.realm',
            '- for the registrar.realm_governing_token_mint',
            '- governing_token_owner is voter_authority',
          ],
        },
        {
          name: 'mint',
          isMut: false,
          isSigner: false,
          docs: [
            'Tokens of this mint must be included in the Voting Mint Configs',
          ],
        },
        {
          name: 'voterWeightRecord',
          isMut: true,
          isSigner: false,
          docs: [
            'Withdraws must update the voter weight record, to prevent a stale',
            'record being used to vote after the withdraw.',
          ],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'destination',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'depositEntryIndex',
          type: 'u8',
        },
        {
          name: 'amount',
          type: 'u64',
        },
      ],
    },
    {
      name: 'closeVoter',
      accounts: [
        {
          name: 'registrar',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'voter',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'voterWeightRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'voterAuthority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'solDestination',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
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
            docs: ['spl-governance program the Realm belongs to'],
            type: 'publicKey',
          },
          {
            name: 'realm',
            docs: ['Realm of the Registrar'],
            type: 'publicKey',
          },
          {
            name: 'governingTokenMint',
            docs: [
              'Governing token mint the Registrar is for',
              'It can either be the Community or the Council mint of the Realm',
              'When the plugin is used the mint is only used as identity of the governing power (voting population)',
              'and the actual token of the mint is not used',
            ],
            type: 'publicKey',
          },
          {
            name: 'votingMintConfigs',
            docs: [
              'Storage for voting mints and their configuration.',
              "The length should be adjusted for one's use case.",
            ],
            type: {
              vec: {
                defined: 'VotingMintConfig',
              },
            },
          },
          {
            name: 'maxMints',
            docs: ['Max mints that voters can create.'],
            type: 'u8',
          },
          {
            name: 'reserved',
            docs: ['Reserved for future upgrades'],
            type: {
              array: ['u8', 127],
            },
          },
        ],
      },
    },
    {
      name: 'voter',
      docs: ['User account for mint voting rights.'],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'voterAuthority',
            docs: ['Voter Authority who owns the account tokens.'],
            type: 'publicKey',
          },
          {
            name: 'registrar',
            docs: ['Registrar in which the voter is created in.'],
            type: 'publicKey',
          },
          {
            name: 'deposits',
            docs: ['Deposit entries for a deposit for a given mint.'],
            type: {
              vec: {
                defined: 'DepositEntry',
              },
            },
          },
          {
            name: 'voterBump',
            docs: ['Voter account bump.'],
            type: 'u8',
          },
          {
            name: 'voterWeightRecordBump',
            docs: ['Voter weight record account bump.'],
            type: 'u8',
          },
          {
            name: 'reserved',
            docs: ['Reserved for future upgrades'],
            type: {
              array: ['u8', 94],
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'DepositEntry',
      docs: ['Bookkeeping for a single deposit for a given mint.'],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'amountDepositedNative',
            docs: [
              'Amount in deposited, in native currency.',
              'Withdraws directly reduce this amount.',
              '',
              'This directly tracks the total amount added by the user. They may',
              'never withdraw more than this amount.',
            ],
            type: 'u64',
          },
          {
            name: 'votingMintConfigIdx',
            docs: ['Points to the VotingMintConfig this deposit uses.'],
            type: 'u8',
          },
          {
            name: 'depositSlotHash',
            docs: [
              'Deposit slot hash.',
              'saves deposit slot hash so that depositor cannot withdraw at the same slot.',
            ],
            type: 'u64',
          },
          {
            name: 'isUsed',
            type: 'bool',
          },
          {
            name: 'reserved',
            docs: ['Reserved for future upgrades'],
            type: {
              array: ['u8', 38],
            },
          },
        ],
      },
    },
    {
      name: 'VotingMintConfig',
      docs: [
        'Exchange rate for an asset that can be used to mint voting rights.',
        '',
        'See documentation of configure_voting_mint for details on how',
        'native token amounts convert to vote weight.',
      ],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'mint',
            docs: ['Mint for this entry.'],
            type: 'publicKey',
          },
          {
            name: 'digitShift',
            docs: [
              'Number of digits to shift native amounts, applying a 10^digit_shift factor.',
            ],
            type: 'i8',
          },
          {
            name: 'mintSupply',
            type: 'u64',
          },
          {
            name: 'reserved1',
            type: {
              array: ['u8', 55],
            },
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
      name: 'InvalidRealmForRegistrar',
      msg: 'Invalid Realm for Registrar',
    },
    {
      code: 6002,
      name: 'InvalidMaxVoterWeightRecordRealm',
      msg: 'Invalid MaxVoterWeightRecord Realm',
    },
    {
      code: 6003,
      name: 'InvalidMaxVoterWeightRecordMint',
      msg: 'Invalid MaxVoterWeightRecord Mint',
    },
    {
      code: 6004,
      name: 'InvalidVoterWeightRecordRealm',
      msg: 'Invalid VoterWeightRecord Realm',
    },
    {
      code: 6005,
      name: 'InvalidVoterWeightRecordMint',
      msg: 'Invalid VoterWeightRecord Mint',
    },
    {
      code: 6006,
      name: 'InvalidTokenOwnerForVoterWeightRecord',
      msg: 'Invalid TokenOwner for VoterWeightRecord',
    },
    {
      code: 6007,
      name: 'Overflow',
      msg: 'Mathematical Overflow',
    },
    {
      code: 6008,
      name: 'SplTokenAccountWithInvalidOwner',
      msg: 'Invalid Token account owner',
    },
    {
      code: 6009,
      name: 'SplTokenMintWithInvalidOwner',
      msg: 'Invalid Mint account owner',
    },
    {
      code: 6010,
      name: 'SplTokenAccountDoesNotExist',
      msg: "Token Account doesn't exist",
    },
    {
      code: 6011,
      name: 'SplTokenInvalidTokenAccountData',
      msg: 'Token account data is invalid',
    },
    {
      code: 6012,
      name: 'SplTokenInvalidMintAccountData',
      msg: 'Token mint account data is invalid',
    },
    {
      code: 6013,
      name: 'SplTokenMintNotInitialized',
      msg: 'Token Mint account is not initialized',
    },
    {
      code: 6014,
      name: 'SplTokenMintDoesNotExist',
      msg: "Token Mint account doesn't exist",
    },
    {
      code: 6015,
      name: 'InvalidAccountData',
      msg: 'Account Data is empty or invalid',
    },
    {
      code: 6016,
      name: 'VoterWeightOverflow',
      msg: 'Math Overflow in VoterWeight',
    },
    {
      code: 6017,
      name: 'MintNotFound',
      msg: 'Mint Not Found in Mint Configs',
    },
    {
      code: 6018,
      name: 'GoverningTokenOwnerMustMatch',
      msg: 'Governing TokenOwner must match',
    },
    {
      code: 6019,
      name: 'InvalidTokenOwnerRecord',
      msg: 'Invalid Token Owner Records',
    },
    {
      code: 6020,
      name: 'OutOfBoundsDepositEntryIndex',
      msg: 'Index is out of Deposit Entry bounds',
    },
    {
      code: 6021,
      name: 'ForbiddenCpi',
      msg: 'No Cpi Allowed',
    },
    {
      code: 6022,
      name: 'VotingTokenNonZero',
      msg: 'Voting Tokens are not withdrawn',
    },
    {
      code: 6023,
      name: 'VaultTokenNonZero',
      msg: 'Vault Tokens are not withdrawn',
    },
    {
      code: 6024,
      name: 'InvalidAuthority',
      msg: 'Invalid Voter Token Authority',
    },
    {
      code: 6025,
      name: 'TokenAmountOverflow',
      msg: 'Math Overflow in Token Amount',
    },
    {
      code: 6026,
      name: 'CannotWithdraw',
      msg: 'Cannot Withdraw in the same slot',
    },
    {
      code: 6027,
      name: 'InvalidResizeMaxMints',
      msg: 'Resizing Max Mints cannot be smaller than Configure Mint Configs',
    },
    {
      code: 6028,
      name: 'MintIndexMismatch',
      msg: 'Mint Index mismatch!',
    },
    {
      code: 6029,
      name: 'DepositIndexInactive',
      msg: 'Inactive Deposit Index!',
    },
  ],
}
