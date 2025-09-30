import { ChevronDownIcon } from '@heroicons/react/outline'
import VoteBySwitch from 'pages/dao/[symbol]/proposal/components/VoteBySwitch'
import React, { useState } from 'react'
import { LinkButton } from './Button'
import Input from './inputs/Input'
import Textarea from './inputs/Textarea'
import { useVoteByCouncilToggle } from '@hooks/useVoteByCouncilToggle'

const AdditionalProposalOptions: React.FC<{
  title: string
  description: string
  setTitle: (evt) => void
  setDescription: (evt) => void
  defaultTitle: string
  defaultDescription?: string
  voteByCouncil: boolean
  setVoteByCouncil: (val) => void
  allowWalletDeposit?: boolean
  setAllowWalletDeposit?: (val) => void
}> = ({
  title,
  description,
  setTitle,
  setDescription,
  defaultTitle,
  defaultDescription,
  voteByCouncil,
  setVoteByCouncil,
  allowWalletDeposit,
  setAllowWalletDeposit,
}) => {
  const [showOptions, setShowOptions] = useState(false)
  const { shouldShowVoteByCouncilToggle } = useVoteByCouncilToggle()
  return (
    <>
      <div className="flex justify-between">
        {setAllowWalletDeposit && (
          <div className="flex items-center space-x-1 mt-2">
            <span className="text-fgd-3 mr-1 text-xs">Deposit from</span>
            <div className="flex items-center">
              <LinkButton
                className={`px-2 border rounded ${
                  allowWalletDeposit
                    ? 'text-primary-light border-primary-light'
                    : 'text-gray-500 border-gray-500'
                }`}
                onClick={() => setAllowWalletDeposit?.(true)}
              >
                Wallet
              </LinkButton>
              <LinkButton
                className={`px-2 border rounded ${
                  !allowWalletDeposit
                    ? 'text-primary-light border-primary-light'
                    : 'text-gray-500 border-gray-500'
                }`}
                onClick={() => setAllowWalletDeposit?.(false)}
              >
                DAO
              </LinkButton>
            </div>
          </div>
        )}
        {!allowWalletDeposit && (
          <LinkButton
            className="flex items-center text-primary-light mt-2"
            onClick={() => setShowOptions(!showOptions)}
          >
            {showOptions ? 'Less Proposal Options' : 'More Proposal Options'}
            <ChevronDownIcon
              className={`default-transition h-5 w-5 ml-1 ${
                showOptions ? 'transform rotate-180' : 'transform rotate-360'
              }`}
            />
          </LinkButton>
        )}
      </div>
      {showOptions && (
        <div className="space-y-4">
          <Input
            noMaxWidth={true}
            label="Proposal Title"
            placeholder={defaultTitle}
            value={title}
            type="text"
            onChange={setTitle}
          />
          <Textarea
            noMaxWidth={true}
            label="Proposal Description"
            placeholder={
              defaultDescription ??
              'Description of your proposal or use a github gist link (optional)'
            }
            wrapperClassName="mb-5"
            value={description}
            onChange={setDescription}
          />
          {shouldShowVoteByCouncilToggle && (
            <VoteBySwitch
              checked={voteByCouncil}
              onChange={() => {
                setVoteByCouncil(!voteByCouncil)
              }}
            ></VoteBySwitch>
          )}
        </div>
      )}
    </>
  )
}

export default AdditionalProposalOptions
