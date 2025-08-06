import { AssetType, Token } from '@models/treasury/Asset';
import { Wallet } from '@models/treasury/Wallet';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import { Token as SplToken } from '@solana/spl-token';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token-new';
import {
  Connection,
  Keypair,
  PublicKey,
  AccountInfo,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { InputReserveType, parseReserve, SolendActionCore } from '@solendprotocol/solend-sdk';
import {
  InstructionWithSigners,
  LendingInstruction,
  SaveWallet,
} from '@solendprotocol/solend-sdk';
import { useQuery } from '@tanstack/react-query';

import BigNumber from 'bignumber.js';
import useGovernanceAssetsStore from 'stores/useGovernanceAssetsStore';

import { Plan, Position } from '..';
import { useJupiterPricesByMintsQuery } from '@hooks/queries/jupiterPrice';
import queryClient from '@hooks/queries/queryClient';
import { useRealmQuery } from '@hooks/queries/realm';
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext';
import useWalletOnePointOh from '@hooks/useWalletOnePointOh';
import { sendTransactionsV3, SequenceType } from '@utils/sendTransactions';
import tokenPriceService from '@utils/services/tokenPrice';

// simulatedAccount is one element from simulated.value.accounts
function simulatedToAccountInfo(simulatedAccount: any): AccountInfo<Buffer> {
  const [base64Data, _encoding] = simulatedAccount.data;
  return {
    data: Buffer.from(base64Data, 'base64'),
    executable: simulatedAccount.executable,
    lamports: simulatedAccount.lamports,
    owner: new PublicKey(simulatedAccount.owner),
    rentEpoch: simulatedAccount.rentEpoch,
  };
}

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

const USDC_RESERVE_ADDRESS = 'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw';
const SOL_RESERVE_ADDRESS = '8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36';
const USDT_RESERVE_ADDRESS = '8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE';
const ELIGIBLE_RESERVES = [
  USDC_RESERVE_ADDRESS,
  SOL_RESERVE_ADDRESS,
  USDT_RESERVE_ADDRESS,
];

export function useFetchReserveInfo(reserveAddresses: string[], config?: Config) {
  const queryFunction = queryClient.fetchQuery<
    {
      address: string;
      mintAddress: string;
      cTokenExchangeRate: number;
      cTokenMint: string;
      mintDecimals: number;
      supplyInterest: number;
      borrowInterest: number;
    }[]
  >({
    queryKey: [...reserveAddresses, config?.address],
    queryFn: async () => {
      if (!config) return [];
      const response = await fetch(
        `https://api.save.finance/reserves?ids=${reserveAddresses.join(',')}`,
      );
      const data = (await response.json()) as {
        results: {
          cTokenExchangeRate: number;
          rates: {
            supplyInterest: number;
            borrowInterest: number;
          };
          reserve: {
            address: string;
            liquidity: {
              mintPubkey: string;
            };
          };
        }[];
      };

      return data.results.map((reserve) => {
        const reserveConfig = config.reserves.find((r) => r.address === reserve.reserve.address);
        if (!reserveConfig) throw new Error('Reserve config not found');
        return {
          address: reserve.reserve.address,
          mintAddress: reserve.reserve.liquidity.mintPubkey,
          cTokenExchangeRate: reserve.cTokenExchangeRate,
          cTokenMint: reserveConfig?.collateralMintAddress,
          mintDecimals: reserveConfig?.liquidityToken.decimals,
          supplyInterest: reserve.rates.supplyInterest,
          borrowInterest: reserve.rates.borrowInterest,
        };
      });
    },
  });

  return useQuery({
    queryKey: [...reserveAddresses, config?.address],
    queryFn: async () => {
      return queryFunction;
    },
  });
}

export type ReserveConfig = {
  liquidityToken: {
  coingeckoID: string;
  decimals: number;
  logo: string;
  mint: string;
  name: string;
  symbol: string;
  volume24h: string;
  },
  pythOracle: string;
  switchboardOracle: string;
  extraOracle: string;
  address: string;
  collateralMintAddress: string;
  collateralSupplyAddress: string;
  liquidityAddress: string;
  liquidityFeeReceiverAddress: string;
  mintAddress: string;
}

export type Config = {
  name: string;
  isPrimary: boolean;
  description: string;
  creator: string;
  address: string;
  hidden: boolean;
  isPermissionless: boolean;
  authorityAddress: string;
  owner: string;
  reserves: ReserveConfig[];
  lookupTableAddress: string;
}

export function useFetchConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await fetch(
        `https://api.save.finance/v1/markets/configs?scope=all&deployment=production`,
      );
      const data = (await response.json()) as Config[];

      return data.map((config) => {
        return {
          ...config,
          reserves: config.reserves.map((reserve) => ({
            ...reserve,
            mintAddress: reserve.liquidityToken.mint,
          })),
        };
      });
    },
  });
}

export function useFetchEarnings(
  reserveAddresses: string[],
  wallets: Wallet[] | undefined,
  connection: Connection,
  config?: Config,
) {
  const atas =
    wallets?.flatMap((wallet) => {
      const reserveConfig = config?.reserves.find((r) => reserveAddresses.includes(r.address));
      if (!reserveConfig) return [];
      return reserveAddresses.map((reserve) => {
        return getAssociatedTokenAddressSync(
          new PublicKey(reserveConfig.collateralMintAddress),
          new PublicKey(wallet.address),
          true,
        );
      });
    }) ?? [];

  const queryFunction = queryClient.fetchQuery<{
    [ataAddress: string]: {
      netAmount: BigNumber;
      netCAmount: BigNumber;
    };
  }>({
    queryKey: [...atas.map((ata) => ata.toBase58()), config?.address],
    queryFn: async () => {
      const earnings: {
        [ataAddress: string]: {
          netAmount: BigNumber;
          netCAmount: BigNumber;
        };
      } = {};
      if (!config) return earnings;
      if (!atas.length) return earnings;

      await Promise.all(
        atas.map(async (ata) => {
          const signatures = await connection.getSignaturesForAddress(
            ata,
            undefined,
            'confirmed',
          );
          if (!signatures.length) return;
          const txns: TransactionHistory[] = await (
            await fetch(
              `${SAVE_TRANSACTIONS_ENDPOINT}?signatures=${signatures
                .filter((s) => !s.err)
                .map((s) => s.signature)
                .join(',')}`,
            )
          )
            .json()
            .catch(() => []);
          let netAmount = new BigNumber(0);
          let netCAmount = new BigNumber(0);

          txns.forEach((txn) => {
            if (
              txn.instruction === LendingInstruction.DepositReserveLiquidity
            ) {
              netAmount = netAmount.plus(txn.liquidityQuantity);
              netCAmount = netCAmount.plus(txn.ctokenQuantity);
            } else if (
              txn.instruction === LendingInstruction.RedeemReserveCollateral
            ) {
              netAmount = netAmount.minus(txn.liquidityQuantity);
              netCAmount = netCAmount.minus(txn.ctokenQuantity);
            }
          });

          earnings[ata.toBase58()] = {
            netAmount,
            netCAmount,
          };
        }),
      );

      return earnings;
    },
  });

  return useQuery({
    queryKey: [...atas.map((ata) => ata.toBase58()), config?.address],
    queryFn: async () => {
      return queryFunction;
    },
  });
}

export const useSavePlans = (
  wallets?: Wallet[],
): {
  indicatorTokens: string[];
  plans: Plan[];
  positions: Position[];
} => {
  const realm = useRealmQuery().data?.result;
  const { data: configs } = useFetchConfig();
  const mainPoolConfig = configs?.find((c) => c.isPrimary);
  // Indicator tokens are collateral tokens or other tokens of this nature that represent a position in Defi. They are excluded from
// beind displayed in the wallet to avoid confusion and clutter.
  const indicatorTokens = [
    ...mainPoolConfig?.reserves.map((reserve) => reserve.collateralMintAddress) ?? [],
  ];
  const { getGovernedAccounts } = useGovernanceAssetsStore();
  const wallet = useWalletOnePointOh();

  const reservesInfo = useFetchReserveInfo(ELIGIBLE_RESERVES, mainPoolConfig);
  const { data: tokenPrices } = useJupiterPricesByMintsQuery(
    reservesInfo.data?.map((r) => new PublicKey(r.mintAddress)) ?? [],
  );
  const connection = useLegacyConnectionContext();
  const { data: earningsData } = useFetchEarnings(
    ELIGIBLE_RESERVES,
    wallets,
    connection.current,
    mainPoolConfig,
  );

  async function deposit(
    reserveAddress: string,
    amount: number,
    realmsWalletAddress: string,
  ) {
    if (!mainPoolConfig) throw new Error('Config not found');
    const reserve = mainPoolConfig.reserves.find((r) => r.address === reserveAddress);
    if (!reserve) throw new Error('Reserve not found');
    const reserveInfo = reservesInfo.data?.find((r) => r.address === reserveAddress);
    if (!reserveInfo) throw new Error('Reserve info not found');
    if (!wallet?.publicKey) throw new Error('Wallet not connected');
    const amountBase = new BigNumber(amount)
      .shiftedBy(reserve.liquidityToken.decimals)
      .dp(0, BigNumber.ROUND_DOWN)
      .toString();

    const inputReserve: InputReserveType = {
      address: reserve.address,
      liquidityAddress: reserve.liquidityAddress,
      cTokenMint: reserve.collateralMintAddress,
      cTokenLiquidityAddress: reserve.liquidityAddress,
      pythOracle: reserve.pythOracle,
      switchboardOracle: reserve.switchboardOracle,
      mintAddress: reserve.mintAddress,
      liquidityFeeReceiverAddress: reserve.liquidityFeeReceiverAddress,
    };

    const solendAction =
      await SolendActionCore.buildDepositReserveLiquidityTxns(
        mainPoolConfig,
        inputReserve,
        connection.current,
        amountBase,
        wallet as SaveWallet,
        {
          lookupTableAddress: mainPoolConfig?.lookupTableAddress
            ? new PublicKey(mainPoolConfig.lookupTableAddress)
            : undefined,
        },
      );

    const solendIxs = await solendAction.getInstructions();

    const ixs = [
      ...solendIxs.oracleIxs,
      ...solendIxs.preLendingIxs,
      ...solendIxs.lendingIxs,
      ...solendIxs.postLendingIxs,
    ] as InstructionWithSigners[];

    // Get Transaction Message
    const message = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: (await connection.current.getLatestBlockhash())
        .blockhash,
      instructions: ixs.map((ix) => ix.instruction),
    }).compileToV0Message();

    // Get Versioned Transaction
    const vtx = new VersionedTransaction(message);

    const res = await connection.current.simulateTransaction(vtx, {
      commitment: 'processed',
      sigVerify: false,
      accounts: {
        encoding: 'base64',
        addresses: [reserveAddress],
      },
    });

    const accountInfo = res?.value.accounts?.map(simulatedToAccountInfo);
    let cTokenExchangeRate = new BigNumber(reserveInfo.cTokenExchangeRate);
    let buffer = 0.02;
    if (accountInfo?.[0]) {
      const simulatedReserve = parseReserve(
        new PublicKey(reserveAddress),
        accountInfo?.[0],
        'base64',
      );

      const decimals = simulatedReserve.info.liquidity.mintDecimals;
      const availableAmount = new BigNumber(
        simulatedReserve.info.liquidity.availableAmount.toString(),
      ).shiftedBy(-decimals);
      const totalBorrow = new BigNumber(
        simulatedReserve.info.liquidity.borrowedAmountWads.toString(),
      ).shiftedBy(-18 - decimals);
      const accumulatedProtocolFees = new BigNumber(
        simulatedReserve.info.liquidity.accumulatedProtocolFeesWads.toString(),
      ).shiftedBy(-18 - decimals);
      const totalSupply = totalBorrow
        .plus(availableAmount)
        .minus(accumulatedProtocolFees);

      cTokenExchangeRate = new BigNumber(totalSupply).dividedBy(
        new BigNumber(
          simulatedReserve.info.collateral.mintTotalSupply.toString(),
        ).shiftedBy(-decimals),
      );
      buffer = 0;
    }

    const userAta = await SplToken.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(reserve.collateralMintAddress),
      wallet.publicKey,
    );

    const walletAta = await SplToken.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(reserve.collateralMintAddress),
      new PublicKey(realmsWalletAddress),
      true,
    );

    const transferAmountBase = new BigNumber(amount)
      .shiftedBy(reserve.liquidityToken.decimals)
      .times(1 - buffer)
      .div(cTokenExchangeRate)
      .dp(0, BigNumber.ROUND_DOWN)
      .toNumber();

    const createAtaIx = await createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      walletAta,
      new PublicKey(realmsWalletAddress),
      new PublicKey(reserve.collateralMintAddress),
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
          instructionsSet: ixs
            .map((ix) => ({
              transactionInstruction: ix.instruction,
              signers: ix.signers?.map((s) =>
                Keypair.fromSecretKey(s.secretKey),
              ),
              alts: ix.lookupTableAccounts,
            }))
            .concat({
              transactionInstruction: createAtaIx,
              signers: [],
              alts: [],
            })
            .concat({
              transactionInstruction: transferIx,
              signers: [],
              alts: [],
            }),
          sequenceType: SequenceType.Sequential,
        },
      ],
    });

    getGovernedAccounts(connection, realm!);
  }

  const positions =
    reservesInfo.data?.flatMap((reserve) => {
      return (
        wallets
          ?.flatMap((wallet) => {
            const account = wallet.assets.find(
              (a) =>
                a.type === AssetType.Token &&
                a.mintAddress === reserve.cTokenMint,
            ) as Token;
            const liquidityAmount = account?.count?.times(
              reserve.cTokenExchangeRate,
            );
            const price = tokenPrices?.[reserve.mintAddress]?.price;

            return account
              ? {
                  planId: reserve.address,
                  accountAddress: account?.address,
                  walletAddress: wallet.address,
                  amount: liquidityAmount,
                  value: liquidityAmount
                    .times(reserve.cTokenExchangeRate)
                    .times(price ?? 0),
                  account,
                  earnings:
                    account.address && earningsData?.[account.address]
                      ? earningsData[account.address].netCAmount
                          .times(reserve.cTokenExchangeRate)
                          .minus(earningsData[account.address].netAmount)
                          .dividedBy(10 ** reserve.mintDecimals)
                      : undefined,
                }
              : undefined;
          })
          .filter((p) => p !== undefined) ?? []
      );
    }) ?? [];

  return {
    indicatorTokens,
    plans:
      reservesInfo.data?.map((reserve) => {
        const info = tokenPriceService.getTokenInfo(reserve.mintAddress);
        const price = tokenPrices?.[reserve.mintAddress]?.price;

        return {
          id: reserve.address,
          protocol: PROTOCOL_SLUG,
          type: 'Lending',
          name: info?.symbol ?? '',
          assets: [
            {
              symbol: info?.symbol ?? '',
              mintAddress: reserve.mintAddress,
              logo: info?.logoURI ?? '',
              decimals: reserve.mintDecimals,
            },
          ],
          apr: reserve.supplyInterest,
          price: price ? Number(price) : undefined,
          deposit: (amount: number, realmsWalletAddress: string) =>
            deposit(reserve.address, amount, realmsWalletAddress),
        };
      }) ?? [],
    positions,
  };
};
