// components/ProposalWarnings.tsx
import { Proposal } from '@solana/spl-governance'
import { ExclamationCircleIcon } from '@heroicons/react/solid'
import { useProposalSafetyCheck } from '@hooks/useProposalSafetyCheck'
import React from "react";

const WarningBox = ({
                      color,
                      title,
                      children,
                    }: {
  color: string
  title: string
  children?: React.ReactNode
}) => (
    <div className={`rounded-md bg-${color}-50 p-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationCircleIcon
              className={`h-5 w-5 text-${color}-400`}
              aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium text-${color}-800`}>{title}</h3>
          {children && (
              <div className="mt-2">
                <p className={`text-sm text-${color}-700`}>{children}</p>
              </div>
          )}
        </div>
      </div>
    </div>
)

const ProposalWarnings = ({ proposal }: { proposal: Proposal }) => {
  const warnings = useProposalSafetyCheck(proposal)

  return (
      <>
        {warnings.includes('setGovernanceConfig') && (
            <WarningBox color="yellow" title="Instructions like this one change the way the DAO is governed">
              This proposal writes to your governance configuration, which could affect how votes are counted. Both the instruction data AND accounts list contain parameters. Before you vote, make sure you review the proposal's instructions and the concerned accounts, and understand the implications of passing this proposal.
            </WarningBox>
        )}

        {warnings.includes('setRealmConfig') && (
            <WarningBox color="yellow" title="Instructions like this one change the way the DAO is governed">
              This proposal writes to your realm configuration, which could affect how votes are counted. Both the instruction data AND accounts list contain parameters. Before you vote, make sure you review the proposal's instructions and the concerned accounts, and understand the implications of passing this proposal.
            </WarningBox>
        )}

        {warnings.includes('thirdPartyInstructionWritesConfig') && (
            <WarningBox color="red" title="Danger: This instruction uses an unknown program to modify your Realm">
              This proposal writes to your realm configuration, this could affect how votes are counted. Writing realm configuration using an unknown program is highly unusual.
            </WarningBox>
        )}

        {warnings.includes('possibleWrongGovernance') && (
            <WarningBox color="yellow" title="Possible wrong governance pass, check accounts." />
        )}

        {warnings.includes('programUpgrade') && (
            <WarningBox color="yellow" title="Instructions like this one are dangerous">
              This proposal upgrade program check params carefully
            </WarningBox>
        )}

        {warnings.includes('usingMangoInstructionForwarder') && (
            <WarningBox color="yellow" title="Instruction uses instruction forward program">
              This means one of instruction is executable only by given wallet until time set in proposal, check time and wallet in instruction panel
            </WarningBox>
        )}

        {warnings.includes('bufferAuthorityMismatch') && (
            <WarningBox color="red" title="Danger alert: The current buffer authority does not match the DAO wallet">
              The current authority can change the buffer account during vote.
            </WarningBox>
        )}
      </>
  )
}

export default ProposalWarnings
