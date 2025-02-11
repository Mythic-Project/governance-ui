import { SOLEND_PRODUCTION_PROGRAM_ID } from "@solendprotocol/solend-sdk";

export const SAVE_INSTRUCTIONS = {
  [SOLEND_PRODUCTION_PROGRAM_ID.toBase58()]: {
    // redeem
    5: {
      name: 'Withdraw from Save',
      accounts: [
        
      ]
    },
    // withdraw
    14: {
      
    }
  }
}
