import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { Wallet } from '@models/treasury/Wallet'
import { AssetType, Token } from "@models/treasury/Asset"
import queryClient from "@hooks/queries/queryClient"
import { useQuery } from "@tanstack/react-query";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token-new'
import { Plan, Position } from "..";
import tokenPriceService from "@utils/services/tokenPrice";
import { useJupiterPricesByMintsQuery } from "@hooks/queries/jupiterPrice";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { InstructionWithSigners, LendingInstruction, SaveWallet } from "@solendprotocol/solend-sdk";
import { SolendActionCore } from "@solendprotocol/solend-sdk";
import { useConnection } from "@solana/wallet-adapter-react";
import BigNumber from "bignumber.js";
import useWalletOnePointOh from "@hooks/useWalletOnePointOh";
import { Token as SplToken } from '@solana/spl-token'
import { sendTransactionsV3, SequenceType } from "@utils/sendTransactions";
import { useRealmQuery } from "@hooks/queries/realm";
import useGovernanceAssetsStore from "stores/useGovernanceAssetsStore";
import useLegacyConnectionContext from "@hooks/useLegacyConnectionContext";

export const PROTOCOL_SLUG = 'Save';

const SAVE_TRANSACTIONS_ENDPOINT = 'https://api.save.finance/transactions';

type TransactionHistory = {
  instruction: LendingInstruction;
  instructionIndex: number;
  market: string;
  signature: string;
  slot: number;
  timestamp: number;
  liquidityMint: string;
  liquidityQuantity: string;
  liquiditySymbol: string;
  ctokenMint: string;
  ctokenQuantity: string;
  ctokenDestinationAccount: string;
  userTransferAuthority: string;
  dumpy: boolean;
};

export const MAIN_POOL_CONFIGS = {
name: "main",
isPrimary: true,
description: "",
creator: "5pHk2TmnqQzRF9L6egy5FfiyBgS7G9cMZ5RFaJAvghzw",
address: "4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY",
hidden: false,
isPermissionless: false,
authorityAddress: "DdZR6zRFiUt4S5mg7AV1uKB2z1f1WzcNYCaTEEWPAuby",
owner: "5pHk2TmnqQzRF9L6egy5FfiyBgS7G9cMZ5RFaJAvghzw",
reserves: [
  {
  address: 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw',
  liquidityAddress: '8SheGtsopRUDzdiD6v6BR9a6bqZ9QwywYQY99Fp5meNf',
  cTokenMint: '993dVFL2uXWYeoXuEBFXR4BijeXdTv4s6BzsCjJZuwqk',
  cTokenLiquidityAddress: 'UtRy8gcEu9fCkDuUrU8EmC7Uc6FZy5NCwttzG7i6nkw',
  pythOracle: 'Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX',
  switchboardOracle: 'BjUgj6YCnFBZ49wF54ddBVA9qu8TeqkFtkbqmZcee8uW',
  mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  liquidityFeeReceiverAddress: '5Gdxn4yquneifE6uk9tK8X4CqHfWKjW2BvYU25hAykwP',
  extraOracle: '11111111111111111111111111111111',
    },
    {
      address: '8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36',
      liquidityAddress: '8UviNr47S8eL6J3WfDxMRa3hvLta1VDJwNWqsDgtN3Cv',
      cTokenMint: '5h6ssFpeDeRbzsEHDbTQNH7nVGgsKrZydxdSTnLm6QdV',
      cTokenLiquidityAddress: 'B1ATuYXNkacjjJS78MAmqu8Lu8PvEPt51u4oBasH1m1g',
      pythOracle: '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE',
      switchboardOracle: 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR',
      mintAddress: 'So11111111111111111111111111111111111111112',
      liquidityFeeReceiverAddress: '5wo1tFpi4HaVKnemqaXeQnBEpezrJXcXvuztYaPhvgC7',
      extraOracle: '11111111111111111111111111111111',
    },
    {
      address: '8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE',
      liquidityAddress: '3CdpSW5dxM7RTxBgxeyt8nnnjqoDbZe48tsBs9QUrmuN',
      cTokenMint: 'BTsbZDV7aCMRJ3VNy9ygV4Q2UeEo9GpR8D6VvmMZzNr8',
      cTokenLiquidityAddress: 'CXDxj6cepVv9nWh4QYqWS2MpeoVKBLKJkMfo3c6Y1Lud',
      pythOracle: 'HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM',
      switchboardOracle: 'ETAaeeuQBwsh9mC2gCov9WdhJENZuffRMXY2HgjCcSL9',
      mintAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      liquidityFeeReceiverAddress: 'Cpyk5WRGmdK2yFGTJCrmgyABPiNEF5eCyCMMZLxpdkXu',
      extraOracle: '11111111111111111111111111111111',
    }

],
lookupTableAddress: "89ig7Cu6Roi9mJMqpY8sBkPYL2cnqzpgP16sJxSUbvct"
}

const USDC_RESERVE_ADDRESS = 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw';
const SOL_RESERVE_ADDRESS = '8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36';
const USDT_RESERVE_ADDRESS = '8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE';
const ELIGIBLE_RESERVES = [USDC_RESERVE_ADDRESS, SOL_RESERVE_ADDRESS, USDT_RESERVE_ADDRESS];

export const RESERVE_CONFIG: {
  [key: string]: {
    cTokenMint: string;
    mintDecimals: number;
    address: string;
    liquidityAddress: string;
    cTokenLiquidityAddress: string;
    pythOracle: string;
    switchboardOracle: string;
    mintAddress: string;
    liquidityFeeReceiverAddress: string;
  }
} = {
  [USDC_RESERVE_ADDRESS]: {
    mintDecimals: 6,
    address: USDC_RESERVE_ADDRESS,
    liquidityAddress: '8SheGtsopRUDzdiD6v6BR9a6bqZ9QwywYQY99Fp5meNf',
    cTokenMint: '993dVFL2uXWYeoXuEBFXR4BijeXdTv4s6BzsCjJZuwqk',
    cTokenLiquidityAddress: 'UtRy8gcEu9fCkDuUrU8EmC7Uc6FZy5NCwttzG7i6nkw',
    pythOracle: 'Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX',
    switchboardOracle: 'nu11111111111111111111111111111111111111111',
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    liquidityFeeReceiverAddress: '5Gdxn4yquneifE6uk9tK8X4CqHfWKjW2BvYU25hAykwP',
  },
  [SOL_RESERVE_ADDRESS]: {
    mintDecimals: 9,
    address: SOL_RESERVE_ADDRESS,
    liquidityAddress: '8UviNr47S8eL6J3WfDxMRa3hvLta1VDJwNWqsDgtN3Cv',
    cTokenMint: '5h6ssFpeDeRbzsEHDbTQNH7nVGgsKrZydxdSTnLm6QdV',
    cTokenLiquidityAddress: 'B1ATuYXNkacjjJS78MAmqu8Lu8PvEPt51u4oBasH1m1g',
    pythOracle: '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE',
    switchboardOracle: 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR',
    mintAddress: 'So11111111111111111111111111111111111111112',
    liquidityFeeReceiverAddress: '5wo1tFpi4HaVKnemqaXeQnBEpezrJXcXvuztYaPhvgC7',
  },
  [USDT_RESERVE_ADDRESS]: {
    mintDecimals: 6,
    address: USDT_RESERVE_ADDRESS,
    liquidityAddress: '3CdpSW5dxM7RTxBgxeyt8nnnjqoDbZe48tsBs9QUrmuN',
    cTokenMint: 'BTsbZDV7aCMRJ3VNy9ygV4Q2UeEo9GpR8D6VvmMZzNr8',
    cTokenLiquidityAddress: 'CXDxj6cepVv9nWh4QYqWS2MpeoVKBLKJkMfo3c6Y1Lud',
    pythOracle: 'HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM',
    switchboardOracle: 'ETAaeeuQBwsh9mC2gCov9WdhJENZuffRMXY2HgjCcSL9',
    mintAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    liquidityFeeReceiverAddress: 'Cpyk5WRGmdK2yFGTJCrmgyABPiNEF5eCyCMMZLxpdkXu',
  },
}

// Indicator tokens are collateral tokens or other tokens of this nature that represent a position in Defi. They are excluded from
// beind displayed in the wallet to avoid confusion and clutter.
export const INDICATOR_TOKENS = [
  ...ELIGIBLE_RESERVES.map((reserve) => RESERVE_CONFIG[reserve].cTokenMint),
]

export function useFetchReserveInfo(reserveAddresses: string[]) {
  const queryFunction = queryClient.fetchQuery<{
    address: string;
    mintAddress: string;
    cTokenExchangeRate: number;
    cTokenMint: string;
    mintDecimals: number;
    supplyInterest: number;
    borrowInterest: number;
  }[]>({
    queryKey: reserveAddresses,
    queryFn: async () => {
      const response = await fetch(`https://api.save.finance/reserves?ids=${reserveAddresses.join(',')}`);
      const data = await response.json() as {
        results: {
          cTokenExchangeRate: number;
          rates: {
            supplyInterest: number;
            borrowInterest: number;
          },
          reserve: {
            address: string;
            liquidity: {
              mintPubkey: string;
            }
          }
        }[];
      };

      return data.results.map(
        (reserve) => {
          const config = RESERVE_CONFIG[reserve.reserve.address];
          return {
            address: reserve.reserve.address,
            mintAddress: reserve.reserve.liquidity.mintPubkey,
            cTokenExchangeRate: reserve.cTokenExchangeRate,
            cTokenMint: config.cTokenMint,
            mintDecimals: config.mintDecimals,
            supplyInterest: reserve.rates.supplyInterest,
            borrowInterest: reserve.rates.borrowInterest,
          }
        }
      );
    },
  })

  return useQuery({
    queryKey: reserveAddresses,
    queryFn: async () => {
      return queryFunction;
    },
  })
}

export function useFetchEarnings(reserveAddresses: string[], wallets: Wallet[] | undefined, connection: Connection) {
  const atas = wallets?.flatMap((wallet) => {
    return reserveAddresses.map((reserve) => {
      return getAssociatedTokenAddressSync(new PublicKey(RESERVE_CONFIG[reserve].cTokenMint), new PublicKey(wallet.address), true);
    })
  }) ?? [];

  const queryFunction = queryClient.fetchQuery<{
    [ataAddress: string]: {
      netAmount: BigNumber;
      netCAmount: BigNumber;
    };
  }>({
    queryKey: atas.map((ata) => ata.toBase58()),
    queryFn: async () => {
      if (!atas.length) return {};
      const earnings: {
        [ataAddress: string]: {
          netAmount: BigNumber;
          netCAmount: BigNumber;
        };
      } = {};

      await Promise.all(atas.map(async (ata) => {
        const signatures = await connection.getSignaturesForAddress(ata, undefined, 'confirmed');
        if (!signatures.length) return;
        const txns: TransactionHistory[] = await (await fetch(`${SAVE_TRANSACTIONS_ENDPOINT}?signatures=${signatures.filter((s) => !s.err).map((s) => s.signature).join(',')}`)).json().catch(() => []);
        let netAmount = new BigNumber(0);
        let netCAmount = new BigNumber(0);

        txns.forEach((txn) => {
          if (txn.instruction === LendingInstruction.DepositReserveLiquidity) {
            netAmount = netAmount.plus(txn.liquidityQuantity);
            netCAmount = netCAmount.plus(txn.ctokenQuantity);
          } else if (txn.instruction === LendingInstruction.RedeemReserveCollateral) {
            netAmount = netAmount.minus(txn.liquidityQuantity);
            netCAmount = netCAmount.minus(txn.ctokenQuantity);
          }
        });

        earnings[ata.toBase58()] = {
          netAmount,
          netCAmount,
        };
      }));

      return earnings;
    },
  })

  return useQuery({
    queryKey: atas.map((ata) => ata.toBase58()),
    queryFn: async () => {
      return queryFunction;
    },
  })
}

export const useSavePlans = (wallets?: Wallet[]): {
  plans: Plan[];
  positions: Position[];
} => {
  const realm = useRealmQuery().data?.result
  const { getGovernedAccounts } = useGovernanceAssetsStore()
  const wallet = useWalletOnePointOh();
  const reservesInfo = useFetchReserveInfo(ELIGIBLE_RESERVES);
  const { data: tokenPrices } = useJupiterPricesByMintsQuery(reservesInfo.data?.map((r) => new PublicKey(r.mintAddress)) ?? []);  
  const connection = useLegacyConnectionContext();
  const {data: earningsData} = useFetchEarnings(ELIGIBLE_RESERVES, wallets, connection.current);

  async function deposit(reserveAddress: string, amount: number, realmsWalletAddress: string) {
    const reserve = reservesInfo.data?.find((r) => r.address === reserveAddress);
    if (!reserve) throw new Error('Reserve not found');
    if (!wallet?.publicKey) throw new Error('Wallet not connected');
    const amountBase = new BigNumber(amount).shiftedBy(reserve?.mintDecimals ?? 0).dp(0, BigNumber.ROUND_DOWN).toString();

    const solendAction = await SolendActionCore.buildDepositReserveLiquidityTxns(
      MAIN_POOL_CONFIGS,
      RESERVE_CONFIG[reserveAddress],
      connection.current,
      amountBase,
      wallet as SaveWallet,
      {
        lookupTableAddress: MAIN_POOL_CONFIGS.lookupTableAddress
          ? new PublicKey(MAIN_POOL_CONFIGS.lookupTableAddress)
          : undefined,
      },
    );

    const solendIxs = await solendAction.getInstructions();

    const userAta = await SplToken.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(reserve.cTokenMint),
      wallet.publicKey,
    );

    const walletAta = await SplToken.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(reserve.cTokenMint),
      new PublicKey(realmsWalletAddress),
      true
    );

    const ixs = [
      ...solendIxs.oracleIxs,
      ...solendIxs.preLendingIxs,
      ...solendIxs.lendingIxs,
      ...solendIxs.postLendingIxs,
    ] as InstructionWithSigners[];

    const transferAmountBase = new BigNumber(amount).shiftedBy(reserve?.mintDecimals ?? 0).div(reserve.cTokenExchangeRate).dp(0, BigNumber.ROUND_DOWN).toNumber();

    const createAtaIx = await createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      walletAta,
      new PublicKey(realmsWalletAddress),
      new PublicKey(reserve.cTokenMint),
    );

    const transferIx = SplToken.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      userAta,
      walletAta,
      wallet.publicKey,
      [],
      transferAmountBase,
    );

    await sendTransactionsV3({
      connection: connection.current,
      wallet,
      transactionInstructions: [
        {
          instructionsSet: ixs.map((ix) => ({
            transactionInstruction: ix.instruction,
            signers: ix.signers?.map((s) => Keypair.fromSecretKey(s.secretKey)),
            alts: ix.lookupTableAccounts,
          })).concat({
            transactionInstruction: createAtaIx,
            signers: [],
            alts: [],
          }).concat({
            transactionInstruction: transferIx,
            signers: [],
            alts: [],
          }),
          sequenceType: SequenceType.Sequential,
        }
      ],
    });

    getGovernedAccounts(connection, realm!)
  }

  const positions = reservesInfo.data?.flatMap((reserve) => {
    return wallets?.flatMap((wallet) => {
      const account = wallet.assets.find((a) => a.type === AssetType.Token && a.mintAddress === reserve.cTokenMint) as Token;
      const liquidityAmount = account?.count?.times(reserve.cTokenExchangeRate);
      const price = tokenPrices?.[reserve.mintAddress]?.price;

      return account ? {
        planId: reserve.address,
        accountAddress: account?.address,
        walletAddress: wallet.address,
        amount: liquidityAmount,
        value: liquidityAmount.times(reserve.cTokenExchangeRate).times(price ?? 0),
        account,
        earnings: (account.address && earningsData?.[account.address]) ? earningsData[account.address].netCAmount.times(reserve.cTokenExchangeRate).minus(earningsData[account.address].netAmount).dividedBy(10 ** reserve.mintDecimals) : undefined,
      } : undefined;
    }).filter((p) => p !== undefined) ?? [];
  }) ?? [];

  return {
      plans: reservesInfo.data?.map((reserve) => {
        const info = tokenPriceService.getTokenInfo(reserve.mintAddress);
        const price = tokenPrices?.[reserve.mintAddress]?.price;

        return ({ 
        id: reserve.address,
        protocol: PROTOCOL_SLUG,
        type: 'Lending',
        name: info?.symbol ?? '',
        assets: [{
          symbol: info?.symbol ?? '',
          mintAddress: reserve.mintAddress,
          logo: info?.logoURI ?? '',
          decimals: reserve.mintDecimals,
        }],
        apr: reserve.supplyInterest,
        price: price ? Number(price) : undefined,
        deposit: (amount: number, realmsWalletAddress: string) => deposit(reserve.address, amount, realmsWalletAddress),
      })}) ?? [],
      positions,
  }
}
