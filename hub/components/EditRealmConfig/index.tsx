import CheckmarkIcon from '@carbon/icons-react/lib/Checkmark';
import ChevronLeftIcon from '@carbon/icons-react/lib/ChevronLeft';
import EditIcon from '@carbon/icons-react/lib/Edit';
import {
  createInstructionData,
  GoverningTokenType,
} from '@solana/spl-governance';
import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { TypeOf } from 'io-ts';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';

import getGovernanceRules from '../EditWalletRules/utils';
import { useGovernanceByPubkeyQuery } from '@hooks/queries/governance';
import { useMintInfoByPubkeyQuery } from '@hooks/queries/mintInfo';
import { useRealmQuery } from '@hooks/queries/realm';
import useCreateProposal from '@hooks/useCreateProposal';
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext';
import useProgramVersion from '@hooks/useProgramVersion';
import useQueryContext from '@hooks/useQueryContext';
import useRealm from '@hooks/useRealm';
import { useRealmVoterWeightPlugins } from '@hooks/useRealmVoterWeightPlugins';
import useWalletOnePointOh from '@hooks/useWalletOnePointOh';
import { Primary, Secondary } from '@hub/components/controls/Button';
import cx from '@hub/lib/cx';

import { notify } from '@utils/notifications';

import { createTransaction } from './createTransaction';
import { fetchConfig, Config } from './fetchConfig';
import { Form } from './Form';
import * as gql from './gql';
import { RealmHeader } from './RealmHeader';
import { Summary } from './Summary';

type Governance = TypeOf<
  typeof gql.getGovernanceResp
>['realmByUrlId']['governance'];

enum Step {
  Form,
  Summary,
}

function stepNum(step: Step): number {
  switch (step) {
    case Step.Form:
      return 1;
    case Step.Summary:
      return 2;
  }
}

function stepName(step: Step): string {
  switch (step) {
    case Step.Form:
      return 'Update Org Configuration';
    case Step.Summary:
      return 'Create Proposal';
  }
}

interface Props {
  className?: string;
  realmUrlId: string;
}

export function EditRealmConfig(props: Props) {
  const connection = useLegacyConnectionContext();
  const { fmtUrlWithCluster } = useQueryContext();
  const realm = useRealmQuery().data?.result;
  const { realmInfo } = useRealm();
  const govData = useGovernanceByPubkeyQuery(realm?.account.authority).data
    ?.result;
  const communityMint = useMintInfoByPubkeyQuery(realm?.account.communityMint)
    .data?.result;
  const councilMint = useMintInfoByPubkeyQuery(
    realm?.account.config.councilMint,
  ).data?.result;
  const version = useProgramVersion();

  const wallet = useWalletOnePointOh();
  const [step, setStep] = useState(Step.Form);
  const [realmName, setRealmName] = useState('');

  // const [result] = useQuery(gql.getRealmResp, {
  //   query: gql.getRealm,
  //   variables: {
  //     realmUrlId: props.realmUrlId,
  //   },
  // });
  const { plugins } = useRealmVoterWeightPlugins();

  const { propose } = useCreateProposal();
  const [governance, setGovernance] = useState<Governance | null>(null);
  // const [governanceResult] = useQuery(gql.getGovernanceResp, {
  //   query: gql.getGovernance,
  //   variables: {
  //     realmUrlId: props.realmUrlId,
  //     governancePublicKey: realmAuthority?.toBase58(),
  //   },
  //   pause: !realmAuthority,
  // });
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [proposalVoteType, setProposalVoteType] = useState<
    'community' | 'council'
  >('community');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalTitle, setProposalTitle] = useState(
    'Update Realms Configuration',
  );

  const [config, setConfig] = useState<Config | null>(null);
  const existingConfig = useRef<Config | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  }, [step]);

  useEffect(() => {
    if (realm) {
      setRealmName(realm.account.name);

      fetchConfig(
        connection.current,
        realm.pubkey,
        plugins?.voterWeight ?? [],
      ).then((config) => {
        setConfig({ ...config });
        setProposalTitle(`Update Realms Config for "${realm.account.name}"`);

        existingConfig.current = {
          ...config,
          config: { ...config.config },
          configAccount: {
            ...config.configAccount,
            communityTokenConfig: {
              ...config.configAccount.communityTokenConfig,
            },
            councilTokenConfig: {
              ...config.configAccount.councilTokenConfig,
            },
          },
        };
      });
    }
  }, [realm]);

  useEffect(() => {
    if (govData && realm) {
      const data = getGovernanceRules(realm.owner, govData, realm);

      const [walletAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from('native-treasury'), govData.pubkey.toBuffer()],
        realm.owner,
      );

      data.communityTokenRules.votingPowerToCreateProposals = communityMint
        ? data.communityTokenRules.votingPowerToCreateProposals.shiftedBy(
            -communityMint.decimals,
          )
        : data.communityTokenRules.votingPowerToCreateProposals;

      if (data.councilTokenRules) {
        data.councilTokenRules.votingPowerToCreateProposals = councilMint
          ? data.councilTokenRules.votingPowerToCreateProposals.shiftedBy(
              -councilMint.decimals,
            )
          : data.councilTokenRules.votingPowerToCreateProposals;
      }

      const updateGovernance: Governance = {
        version: version ?? 3,
        walletAddress,
        ...data,
        communityTokenRules: {
          ...data.communityTokenRules,
          totalSupply: communityMint
            ? new BigNumber(communityMint.supply.toString()).shiftedBy(
                -communityMint.decimals,
              )
            : new BigNumber(0),
          tokenMintDecimals: communityMint
            ? new BigNumber(communityMint.decimals)
            : new BigNumber(0),
        },
        councilTokenRules:
          councilMint && data.councilTokenRules
            ? {
                ...data.councilTokenRules,
                canCreateProposal: data.councilTokenRules.canCreateProposal!,
                totalSupply: councilMint
                  ? new BigNumber(councilMint.supply.toString()).shiftedBy(
                      -councilMint.decimals,
                    )
                  : new BigNumber(0),
                tokenMintDecimals: communityMint
                  ? new BigNumber(communityMint.decimals)
                  : new BigNumber(0),
              }
            : null,
      };

      setGovernance(updateGovernance);

      if (existingConfig.current) {
        if (
          existingConfig.current.config.councilMint &&
          (existingConfig.current.configAccount.communityTokenConfig
            .tokenType === GoverningTokenType.Dormant ||
            !data.communityTokenRules.canVote)
        ) {
          setProposalVoteType('council');
        }
      }
    }
  }, [govData, realm]);

  return !wallet?.publicKey ? (
    <div className={cx(props.className)}>
      <Head>
        <title>Edit Org Config - {realmName}</title>
        <meta
          property="og:title"
          content={`Edit Org Config - ${realmName}`}
          key="title"
        />
      </Head>
      <div className="w-full max-w-3xl pt-14 mx-auto grid place-items-center">
        <div className="my-16 py-8 px-16 dark:bg-black/40 rounded flex flex-col items-center">
          <div className="text-white mb-2 text-center">
            Please sign in to edit the realm config
            <br />
            for "{realmName}"
          </div>
        </div>
      </div>
    </div>
  ) : !(config && existingConfig.current && governance) ? (
    <div />
  ) : (
    <div className={cx(props.className, 'dark:bg-neutral-900')}>
      <div className="w-full max-w-3xl pt-14 mx-auto">
        <Head>
          <title>Edit Org Config - {realmName}</title>
          <meta
            property="og:title"
            content={`Edit Org Config - ${realmName}`}
            key="title"
          />
        </Head>
        <div className="flex items-center mt-4">
          <div className="text-sm dark:text-neutral-500">
            Step {stepNum(step)} of 2
          </div>
          <div className="text-sm dark:text-white ml-2">{stepName(step)}</div>
        </div>
        <div className="py-16">
          <RealmHeader
            className="mb-2.5"
            realmIconUrl={realmInfo?.ogImage}
            realmName={realmName}
          />
          {step === Step.Form && (
            <>
              <Form
                className="mb-16"
                config={config}
                councilRules={governance.councilTokenRules}
                currentConfig={existingConfig.current}
                walletAddress={wallet.publicKey}
                onConfigChange={setConfig}
              />
              <footer className="flex items-center justify-between">
                <button
                  className="flex items-center text-sm text-neutral-500"
                  onClick={() => router.back()}
                >
                  <ChevronLeftIcon className="h-4 fill-current w-4" />
                  Go Back
                </button>
                <Secondary
                  className="h-14 w-44"
                  onClick={() => setStep(Step.Summary)}
                >
                  Continue
                </Secondary>
              </footer>
            </>
          )}
          {step === Step.Summary && (
            <>
              <Summary
                className="mb-16"
                config={config}
                currentConfig={existingConfig.current}
                governance={governance}
                proposalDescription={proposalDescription}
                proposalTitle={proposalTitle}
                proposalVoteType={proposalVoteType}
                walletAddress={wallet.publicKey}
                onProposalDescriptionChange={setProposalDescription}
                onProposalTitleChange={setProposalTitle}
                onProposalVoteTypeChange={setProposalVoteType}
              />
              <footer className="flex items-center justify-end">
                <button
                  className="flex items-center text-sm text-neutral-500"
                  onClick={() => setStep(Step.Form)}
                >
                  <EditIcon className="h-4 fill-current mr-1 w-4" />
                  Go Back
                </button>
                <Primary
                  className="ml-16 h-14 w-44"
                  pending={submitting}
                  onClick={async () => {
                    if (!existingConfig.current) {
                      return;
                    }
                    if (!wallet.publicKey) throw new Error();
                    if (!realm) throw new Error();

                    setSubmitting(true);

                    const userPublicKey = wallet.publicKey;

                    const instructions = await createTransaction(
                      realm.pubkey,
                      governance.governanceAddress,
                      config,
                      existingConfig.current,
                      connection.current,
                      connection.cluster === 'devnet',
                      {
                        publicKey: userPublicKey,
                        signAllTransactions: wallet.signAllTransactions,
                        signTransaction: wallet.signTransaction,
                      },
                    );

                    try {
                      const proposalAddress = await propose({
                        title: proposalTitle,
                        description: proposalDescription,
                        voteByCouncil: proposalVoteType === 'council',
                        instructionsData: instructions.map((ix) => ({
                          data: createInstructionData(ix),
                          holdUpTime:
                            60 * 60 * 24 * governance.minInstructionHoldupDays,
                          prerequisiteInstructions: [],
                        })),
                        governance: governance.governanceAddress,
                      });

                      if (proposalAddress) {
                        router.push(
                          fmtUrlWithCluster(
                            `/dao/${
                              props.realmUrlId
                            }/proposal/${proposalAddress.toBase58()}`,
                          ),
                        );
                      }
                    } catch (e) {
                      console.error(e);
                      notify({
                        type: 'error',
                        message: 'Could not create proposal: ' + String(e),
                      });
                    }

                    setSubmitting(false);
                  }}
                >
                  <CheckmarkIcon className="h-4 fill-current mr-1 w-4" />
                  Create Proposal
                </Primary>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
