export type MythicMetadata = {
  "version": "0.1.0",
  "name": "mythic_metadata",
  "instructions": [
    {
      "name": "createMetadataKey",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "namespaceAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadataKey",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateMetadataKeyArgs"
          }
        }
      ]
    },
    {
      "name": "createMetadata",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateMetadataArgs"
          }
        }
      ]
    },
    {
      "name": "appendMetadataCollection",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AppendMetadataCollectionArgs"
          }
        }
      ]
    },
    {
      "name": "removeMetadataCollection",
      "accounts": [
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setCollectionUpdateAuthority",
      "accounts": [
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "SetCollectionUpdateAuthorityArgs"
          }
        }
      ]
    },
    {
      "name": "revokeCollectionUpdateAuthority",
      "accounts": [
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "appendMetadataItem",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AppendMetadataItemArgs"
          }
        }
      ]
    },
    {
      "name": "appendMetadataItems",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AppendMetadataItemsArgs"
          }
        }
      ]
    },
    {
      "name": "updateMetadataItem",
      "accounts": [
        {
          "name": "updateAuthority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateMetadataItemArgs"
          }
        }
      ]
    },
    {
      "name": "removeMetadataItem",
      "accounts": [
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadataKey",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "metadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subject",
            "docs": [
              "The subject described by the metadata (e.g. a DAO, NFT, a program etc.)"
            ],
            "type": "publicKey"
          },
          {
            "name": "metadataKeyId",
            "docs": [
              "The Metadata Key  Id"
            ],
            "type": "u64"
          },
          {
            "name": "issuingAuthority",
            "docs": [
              "The authority which issued (created) the Metadata account and owns it",
              "Note: The authority is embedded in the PDA seeds and cannot be changed",
              "If a new authority is required then a new Metadata account must be created",
              "",
              "Metadata can be self issued by the subject or issued by a third party",
              "For example a DAO can issue metadata about itself using the DAO's authority",
              "Or external authority can issue claims, certifications etc. about the DAO",
              "",
              "TODO:",
              "- Should it also be allowed to close the account?"
            ],
            "type": "publicKey"
          },
          {
            "name": "updateSlot",
            "docs": [
              "The slot when the collection was last updated",
              "The collection update slot is max(update_slot) for all its metadata items"
            ],
            "type": "u64"
          },
          {
            "name": "updateAuthority",
            "docs": [
              "The default update authority for all the collections",
              "Note: The authority can be overridden at the collection level",
              "Setting the authority to None makes the Metadata immutable"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "items",
            "type": {
              "vec": {
                "defined": "MetadataItem"
              }
            }
          },
          {
            "name": "collections",
            "type": {
              "vec": {
                "defined": "MetadataCollection"
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "metadataKey",
      "docs": [
        "MetadataKey account defines a single metadata value"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "docs": [
              "Id"
            ],
            "type": "u64"
          },
          {
            "name": "namespaceAuthority",
            "docs": [
              "Authority of the MetadataKey namespace",
              "It allows authorities to create unique namespaces for metadata keys"
            ],
            "type": "publicKey"
          },
          {
            "name": "name",
            "docs": [
              "Name of the metadata value represented by the MetadataKey"
            ],
            "type": "string"
          },
          {
            "name": "label",
            "docs": [
              "User friendly label of the value represented by the MetadataKey"
            ],
            "type": "string"
          },
          {
            "name": "description",
            "docs": [
              "Description of the value represented by the MetadataKey"
            ],
            "type": "string"
          },
          {
            "name": "contentType",
            "docs": [
              "The type of the metadata described by the key",
              "e.g. string, number, image, metadata, metadata-collection etc."
            ],
            "type": "string"
          },
          {
            "name": "bump",
            "docs": [
              "Bump"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "AppendMetadataCollectionArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "AppendMetadataItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "AppendMetadataItemsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "SetCollectionUpdateAuthorityArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newUpdateAuthority",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "CreateMetadataArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subject",
            "type": "publicKey"
          },
          {
            "name": "updateAuthority",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "CreateMetadataKeyArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "label",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "contentType",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "UpdateMetadataItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newValue",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "MetadataCollection",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "metadataKeyId",
            "docs": [
              "The Metadata Key  Id"
            ],
            "type": "u64"
          },
          {
            "name": "updateSlot",
            "docs": [
              "The slot when the collection was last updated",
              "The collection update slot is max(update_slot) for all its metadata items"
            ],
            "type": "u64"
          },
          {
            "name": "updateAuthority",
            "docs": [
              "The authority that can update the collection metadata items",
              "Separate update instructions can be invoked to add/revoke specific collection's update_authority",
              "If the collection level update authority is None then parent Metadata update_authority is used"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "items",
            "type": {
              "vec": {
                "defined": "MetadataItem"
              }
            }
          }
        ]
      }
    },
    {
      "name": "MetadataItem",
      "docs": [
        "MetadataItem defines a single metadata item identified by its MetadataKey"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "metadataKeyId",
            "docs": [
              "The Metadata Key Id"
            ],
            "type": "u64"
          },
          {
            "name": "updateSlot",
            "docs": [
              "The slot when the value was last updated"
            ],
            "type": "u64"
          },
          {
            "name": "value",
            "docs": [
              "Serialized metadata item value"
            ],
            "type": "bytes"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "CounterIdReachedMax",
      "msg": "Cannot increment ID"
    },
    {
      "code": 6001,
      "name": "InvalidAccountOwner",
      "msg": "Invalid account owner"
    },
    {
      "code": 6002,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6003,
      "name": "ImmutableMetadata",
      "msg": "Metadata immutable"
    },
    {
      "code": 6004,
      "name": "InvalidMetadataKey",
      "msg": "Invalid MetadataKey"
    },
    {
      "code": 6005,
      "name": "MetadataCollectionFull",
      "msg": "Metadata collection is full"
    },
    {
      "code": 6006,
      "name": "MetadataCollectionAlreadyExists",
      "msg": "Metadata collection already exists"
    },
    {
      "code": 6007,
      "name": "MetadataCollectionNonExistent",
      "msg": "Metadata collection does not exist"
    },
    {
      "code": 6008,
      "name": "MetadataItemFull",
      "msg": "Metadata item is full"
    },
    {
      "code": 6009,
      "name": "MetadataItemAlreadyExists",
      "msg": "Metadata item already exists"
    },
    {
      "code": 6010,
      "name": "MetadataItemNonExistent",
      "msg": "Metadata item does not exist"
    },
    {
      "code": 6011,
      "name": "MetadataItemValueLenExceeded",
      "msg": "Metadata item value len exceeded"
    }
  ]
};

export const IDL: MythicMetadata = {
  "version": "0.1.0",
  "name": "mythic_metadata",
  "instructions": [
    {
      "name": "createMetadataKey",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "namespaceAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadataKey",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateMetadataKeyArgs"
          }
        }
      ]
    },
    {
      "name": "createMetadata",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "CreateMetadataArgs"
          }
        }
      ]
    },
    {
      "name": "appendMetadataCollection",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AppendMetadataCollectionArgs"
          }
        }
      ]
    },
    {
      "name": "removeMetadataCollection",
      "accounts": [
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "setCollectionUpdateAuthority",
      "accounts": [
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "SetCollectionUpdateAuthorityArgs"
          }
        }
      ]
    },
    {
      "name": "revokeCollectionUpdateAuthority",
      "accounts": [
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "appendMetadataItem",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AppendMetadataItemArgs"
          }
        }
      ]
    },
    {
      "name": "appendMetadataItems",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "AppendMetadataItemsArgs"
          }
        }
      ]
    },
    {
      "name": "updateMetadataItem",
      "accounts": [
        {
          "name": "updateAuthority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateMetadataItemArgs"
          }
        }
      ]
    },
    {
      "name": "removeMetadataItem",
      "accounts": [
        {
          "name": "issuingAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "metadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collectionMetadataKey",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "itemMetadataKey",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "metadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subject",
            "docs": [
              "The subject described by the metadata (e.g. a DAO, NFT, a program etc.)"
            ],
            "type": "publicKey"
          },
          {
            "name": "metadataKeyId",
            "docs": [
              "The Metadata Key  Id"
            ],
            "type": "u64"
          },
          {
            "name": "issuingAuthority",
            "docs": [
              "The authority which issued (created) the Metadata account and owns it",
              "Note: The authority is embedded in the PDA seeds and cannot be changed",
              "If a new authority is required then a new Metadata account must be created",
              "",
              "Metadata can be self issued by the subject or issued by a third party",
              "For example a DAO can issue metadata about itself using the DAO's authority",
              "Or external authority can issue claims, certifications etc. about the DAO",
              "",
              "TODO:",
              "- Should it also be allowed to close the account?"
            ],
            "type": "publicKey"
          },
          {
            "name": "updateSlot",
            "docs": [
              "The slot when the collection was last updated",
              "The collection update slot is max(update_slot) for all its metadata items"
            ],
            "type": "u64"
          },
          {
            "name": "updateAuthority",
            "docs": [
              "The default update authority for all the collections",
              "Note: The authority can be overridden at the collection level",
              "Setting the authority to None makes the Metadata immutable"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "items",
            "type": {
              "vec": {
                "defined": "MetadataItem"
              }
            }
          },
          {
            "name": "collections",
            "type": {
              "vec": {
                "defined": "MetadataCollection"
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "metadataKey",
      "docs": [
        "MetadataKey account defines a single metadata value"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "docs": [
              "Id"
            ],
            "type": "u64"
          },
          {
            "name": "namespaceAuthority",
            "docs": [
              "Authority of the MetadataKey namespace",
              "It allows authorities to create unique namespaces for metadata keys"
            ],
            "type": "publicKey"
          },
          {
            "name": "name",
            "docs": [
              "Name of the metadata value represented by the MetadataKey"
            ],
            "type": "string"
          },
          {
            "name": "label",
            "docs": [
              "User friendly label of the value represented by the MetadataKey"
            ],
            "type": "string"
          },
          {
            "name": "description",
            "docs": [
              "Description of the value represented by the MetadataKey"
            ],
            "type": "string"
          },
          {
            "name": "contentType",
            "docs": [
              "The type of the metadata described by the key",
              "e.g. string, number, image, metadata, metadata-collection etc."
            ],
            "type": "string"
          },
          {
            "name": "bump",
            "docs": [
              "Bump"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "AppendMetadataCollectionArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "AppendMetadataItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "AppendMetadataItemsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "SetCollectionUpdateAuthorityArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newUpdateAuthority",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "CreateMetadataArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subject",
            "type": "publicKey"
          },
          {
            "name": "updateAuthority",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "CreateMetadataKeyArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "label",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "contentType",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "UpdateMetadataItemArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newValue",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "MetadataCollection",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "metadataKeyId",
            "docs": [
              "The Metadata Key  Id"
            ],
            "type": "u64"
          },
          {
            "name": "updateSlot",
            "docs": [
              "The slot when the collection was last updated",
              "The collection update slot is max(update_slot) for all its metadata items"
            ],
            "type": "u64"
          },
          {
            "name": "updateAuthority",
            "docs": [
              "The authority that can update the collection metadata items",
              "Separate update instructions can be invoked to add/revoke specific collection's update_authority",
              "If the collection level update authority is None then parent Metadata update_authority is used"
            ],
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "items",
            "type": {
              "vec": {
                "defined": "MetadataItem"
              }
            }
          }
        ]
      }
    },
    {
      "name": "MetadataItem",
      "docs": [
        "MetadataItem defines a single metadata item identified by its MetadataKey"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "metadataKeyId",
            "docs": [
              "The Metadata Key Id"
            ],
            "type": "u64"
          },
          {
            "name": "updateSlot",
            "docs": [
              "The slot when the value was last updated"
            ],
            "type": "u64"
          },
          {
            "name": "value",
            "docs": [
              "Serialized metadata item value"
            ],
            "type": "bytes"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "CounterIdReachedMax",
      "msg": "Cannot increment ID"
    },
    {
      "code": 6001,
      "name": "InvalidAccountOwner",
      "msg": "Invalid account owner"
    },
    {
      "code": 6002,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6003,
      "name": "ImmutableMetadata",
      "msg": "Metadata immutable"
    },
    {
      "code": 6004,
      "name": "InvalidMetadataKey",
      "msg": "Invalid MetadataKey"
    },
    {
      "code": 6005,
      "name": "MetadataCollectionFull",
      "msg": "Metadata collection is full"
    },
    {
      "code": 6006,
      "name": "MetadataCollectionAlreadyExists",
      "msg": "Metadata collection already exists"
    },
    {
      "code": 6007,
      "name": "MetadataCollectionNonExistent",
      "msg": "Metadata collection does not exist"
    },
    {
      "code": 6008,
      "name": "MetadataItemFull",
      "msg": "Metadata item is full"
    },
    {
      "code": 6009,
      "name": "MetadataItemAlreadyExists",
      "msg": "Metadata item already exists"
    },
    {
      "code": 6010,
      "name": "MetadataItemNonExistent",
      "msg": "Metadata item does not exist"
    },
    {
      "code": 6011,
      "name": "MetadataItemValueLenExceeded",
      "msg": "Metadata item value len exceeded"
    }
  ]
};
