import { useSelectedRealmInfo } from '@hooks/selectedRealm/useSelectedRealmRegistryEntry'
import useRpcContext from '@hooks/useRpcContext'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { serializeInstructionToBase64 } from '@solana/spl-governance'
import { TransactionInstruction } from '@solana/web3.js'
import { DistributionFunctionInputType, DistributorInput, EventType, OfferInput, ProjectInput, ProjectResponse, RewardActivationType, TorqueSDK } from '@torque-labs/sdk'
import { TorqueCreateRecurringPaymentForm, TorqueStreamType } from '@utils/uiTypes/proposalCreationTypes'
import { useRef } from 'react'
import { StreamedRewardCadenceType } from '@torque-labs/sdk'

// Helper function to convert time units to seconds
const convertToSeconds = (value: number, unit: string): number => {
  switch (unit) {
    case 'days':
      return value * 86400
    case 'weeks':
      return value * 604800
    case 'months':
      return value * 2592000 // Approximate
    case 'years':
      return value * 31536000 // Approximate
    default:
      return 0
  }
}

interface CreateStreamDistributorArgs {
    offerId: string,
    totalAmount: number,
    amountPerPayment: number,
    token: string,
    decimals: number,
    numberOfPayments: number,
    streamType: TorqueStreamType,
    paymentInterval?: number,
    startDate: string,
    payer: string
}

export function useTorque() {
  const { getRpcContext } = useRpcContext()
  const realmsInfo = useSelectedRealmInfo()
  const wallet = useWalletOnePointOh()
  const sdkRef = useRef<TorqueSDK | null>(null)

  async function getSdk() {
    if (!sdkRef.current) {
      if (!wallet || !wallet.publicKey) {
        throw new Error('Wallet not found')
      }

      const rpcUrl = getRpcContext()?.endpoint
      if (!rpcUrl) {
        throw new Error('RPC URL not found')
      }

      sdkRef.current = new TorqueSDK({
        apiUrl: 'https://server-devnet.torque.so',
        rpcUrl,
      })
      await sdkRef.current.authenticate(wallet)
    }
    return sdkRef.current
  }

  async function fetchDaoProject(daoWallet: string) {
    const torqueSdk = await getSdk()
    let project: ProjectResponse | null = null

    try {
      const existingProjects = await torqueSdk.projects.getProjects()
      if(existingProjects.length === 0) {
        throw new Error('No projects found')
      }
      project = existingProjects[0]?.id ? existingProjects[0] : null
    } catch (error) {
      console.log("error", error)
      const projectInput: ProjectInput = {
        name: `Realms DAO - ${daoWallet}`,
        description: `Project to handle all Torque related activities for ${daoWallet}`,
        ownerId: daoWallet,
      }

      project = await torqueSdk.projects.createProject(projectInput)
    }
    return project
  }

  async function createStreamOffer(form: TorqueCreateRecurringPaymentForm, projectId: string) {
    const torqueSdk = await getSdk()

    const startDate = form.streamType.value === 'FIRST_OF_EVERY_MONTH' ? new Date() : new Date(form.startDate)
    const endDate = form.streamType.value === 'FIRST_OF_EVERY_MONTH' ? new Date(startDate.setMonth(new Date().getMonth() + form.paymentDuration)) : new Date(startDate.setDate(new Date().getSeconds() + form.paymentDuration))

    const requirements: OfferInput['requirements'] = [
        {
          type: EventType.CLAIM,
          config: {
            claim: {
              type: "boolean",
              exact: true,
            },
          },
          oracle: 'CUSTOM_EVENT_PROVIDER',
        }
      ]
  
      const metadata: OfferInput['metadata'] = {
        title: `Payout to ${form.paymentDestination}`,
        description: `${realmsInfo?.displayName ?? 'Dao'} will pay out ${form.governedTokenAccount?.extensions.mint?.publicKey.toBase58()} to ${form.paymentDestination}.`,
      }
  
      const audience: OfferInput['audience'] = {
        name: `Payout to ${form.paymentDestination}`,
        type: 'ALLOWLIST',
        addresses: [form.paymentDestination],
      }
  
      const offerInput: OfferInput = {
        projectId: projectId,
        requirements: requirements,
        metadata: metadata,
        audience: audience,
        startTime: new Date(form.startDate),
        endTime: endDate,
      }
  
      const offer = await torqueSdk.offers.createOffer(offerInput);

      return offer;
  }

  async function createStreamDistributor(args: CreateStreamDistributorArgs) {

    const emissionType = args.token === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'TOKENS';

    if(args.streamType.value === 'FIXED_INTERVAL' && (!args.paymentInterval || !args.startDate)) {
        throw new Error('Payment interval and start date are required for fixed interval streams')
    }

    const streamed: DistributorInput['crankGuard']['streamed'] = args.streamType.value === 'FIXED_INTERVAL' ? {
        type: StreamedRewardCadenceType.FIXED_INTERVAL,
        maxStreams: args.numberOfPayments,
        requireClaim: true,
        cadence: {
            seconds: convertToSeconds(args.paymentInterval || 0, 'days'),
            startDate: new Date(args.startDate)
        }
    } : {
        type: StreamedRewardCadenceType.FIRST_OF_EVERY_MONTH,
        maxStreams: args.numberOfPayments,
        requireClaim: true
    }


    const torqueSdk = await getSdk()
    const distributionInput: DistributorInput = {
        type: 'CONVERSION',
        emissionType,
        tokenAddress: emissionType === 'TOKENS' ?  args.token : undefined,
        tokenDecimals: args.decimals,
        totalFundAmount: args.totalAmount,
        crankGuard: {
          recipient: "USER",
          activation: { type: RewardActivationType.OFFER_START },
          distributionFunctionInput: {
            type: DistributionFunctionInputType.CONVERSION_INDEX,
          },
          availability: {
            maxConversionsPerRecipient: 1,
          },
          streamed
        },
        distributionFunction: {
          type: "CONSTANT",
          yIntercept: args.amountPerPayment
        },
        closeAuthority: args.payer
      };

      console.log("distributionInput", distributionInput)
  
      const distributor = await torqueSdk.offers.addDistributor(args.offerId, distributionInput)
      const {instruction: distributorIx} = await torqueSdk.offers.distributorInstructions(args.offerId, distributor.id, args.payer, true )

      console.log("distributorIx", distributorIx)

      const serializedIx = serializeInstructionToBase64(distributorIx as TransactionInstruction)

      return {
        rawIx: distributorIx,
        serializedIx,
        distributor
      }
  }


  return {
    fetchDaoProject,
    createStreamOffer,
    createStreamDistributor
  }
}
