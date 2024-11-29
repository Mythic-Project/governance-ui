import { PublicKey } from "@metaplex-foundation/js";
import { Governance, ProgramAccount, Realm, VoteThresholdType, VoteTipping } from "@solana/spl-governance";
import BigNumber from "bignumber.js";
import { secondsToHours } from "date-fns";
import { MAX_NUM } from "./constants";
import { GovernanceTokenType } from "@hub/types/GovernanceTokenType";
import { isNil } from "lodash";
import { GovernanceVoteTipping } from "@hub/types/GovernanceVoteTipping";

function voteTippingToGovernanceVoteTipping(voteTipping: VoteTipping | string) {
  switch (voteTipping) {
    case VoteTipping.Disabled:
      return GovernanceVoteTipping.Disabled;
    case VoteTipping.Early:
      return GovernanceVoteTipping.Early;
    case VoteTipping.Strict:
      return GovernanceVoteTipping.Strict;
    case 'DISABLED':
      return GovernanceVoteTipping.Disabled;
    case 'EARLY':
      return GovernanceVoteTipping.Early;
    case 'STRICT':
      return GovernanceVoteTipping.Strict;
    default:
      return GovernanceVoteTipping.Disabled;
  }
}

/**
 * Get the rules for a governance
 */
function getGovernanceRules(
  programPublicKey: PublicKey,
  governanceAccount: ProgramAccount<Governance>,
  realm: ProgramAccount<Realm>
) {
  const onChainConfig = governanceAccount.account.config;

  const councilMint = realm.account.config.councilMint?.toBase58();
  const communityMint = realm.account.communityMint.toBase58();

  const rules = {
    governanceAddress: governanceAccount.pubkey,
    coolOffHours: secondsToHours(onChainConfig.votingCoolOffTime || 0),
    councilTokenRules: councilMint
      ? {
          canCreateProposal: new BigNumber(
            onChainConfig.minCouncilTokensToCreateProposal.toString(),
          ).isLessThan(MAX_NUM),
          canVeto:
            onChainConfig.councilVetoVoteThreshold?.type ===
              VoteThresholdType.YesVotePercentage ||
            onChainConfig.councilVetoVoteThreshold?.type === VoteThresholdType.QuorumPercentage
              ? true
              : false,
          canVote:
            onChainConfig.councilVoteThreshold?.type === VoteThresholdType.Disabled
              ? false
              : true,
          quorumPercent: onChainConfig.councilVoteThreshold
            ? onChainConfig.councilVoteThreshold.type === VoteThresholdType.Disabled
              ? 60
              : onChainConfig.councilVoteThreshold.value || 60
            : 60,
          tokenMintAddress: new PublicKey(councilMint),
          // tokenMintDecimals: new BigNumber(councilMintInfo.account.decimals),
          tokenType: GovernanceTokenType.Council,
          // totalSupply: new BigNumber(councilMintInfo.account.supply.toString()).shiftedBy(
          //   -councilMintInfo.account.decimals,
          // ),
          vetoQuorumPercent: onChainConfig.councilVetoVoteThreshold
            ? onChainConfig.councilVetoVoteThreshold.type === VoteThresholdType.Disabled
              ? 60
              : onChainConfig.councilVetoVoteThreshold.value || 60
            : 60,
          voteTipping: voteTippingToGovernanceVoteTipping(onChainConfig.councilVoteTipping),
          votingPowerToCreateProposals: new BigNumber(
            onChainConfig.minCouncilTokensToCreateProposal.toString(),
          )
        }
      : null,
    communityTokenRules: {
      canCreateProposal: new BigNumber(
        onChainConfig.minCommunityTokensToCreateProposal.toString(),
      ).isLessThan(MAX_NUM),
      canVeto:
        onChainConfig.communityVetoVoteThreshold?.type === VoteThresholdType.YesVotePercentage ||
        onChainConfig.communityVetoVoteThreshold?.type === VoteThresholdType.QuorumPercentage
          ? true
          : false,
      canVote:
        onChainConfig.communityVoteThreshold?.type === VoteThresholdType.Disabled ? false : true,
      quorumPercent: onChainConfig.communityVoteThreshold
        ? onChainConfig.communityVoteThreshold.type === VoteThresholdType.Disabled
          ? 60
          : onChainConfig.communityVoteThreshold.value || 60
        : 60,
      tokenMintAddress: new PublicKey(communityMint),
      // tokenMintDecimals: new BigNumber(communityMintInfo.account.decimals),
      tokenType: GovernanceTokenType.Community,
      // totalSupply: new BigNumber(communityMintInfo.account.supply.toString()).shiftedBy(
      //   -communityMintInfo.account.decimals,
      // ),
      vetoQuorumPercent: onChainConfig.communityVetoVoteThreshold
        ? onChainConfig.communityVetoVoteThreshold.type === VoteThresholdType.Disabled
          ? 60
          : onChainConfig.communityVetoVoteThreshold.value || 60
        : 60,
      voteTipping: voteTippingToGovernanceVoteTipping(onChainConfig.communityVoteTipping),
      votingPowerToCreateProposals: new BigNumber(
        onChainConfig.minCommunityTokensToCreateProposal.toString(),
      )
    },
    depositExemptProposalCount: isNil((onChainConfig as any)['depositExemptProposalCount'])
      ? 10
      : (onChainConfig as any)['depositExemptProposalCount'],
    maxVoteDays: secondsToHours(onChainConfig.baseVotingTime) / 24,
    minInstructionHoldupDays: secondsToHours(onChainConfig.minInstructionHoldUpTime) / 24,
    // version: programVersion,
  };

  return rules;
}

export default getGovernanceRules;