import Modal from '@components/Modal'
import Input from '@components/inputs/Input'
import VoteBySwitch from '../proposal/components/VoteBySwitch'
import Textarea from '@components/inputs/Textarea'
import { Governance, ProgramAccount } from '@solana/spl-governance'
import {
  getCreateTokenMetadataInstruction,
  getUpdateTokenMetadataInstruction,
  validateInstruction,
} from '@utils/instructionTools'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import useCreateProposal from '@hooks/useCreateProposal'
import { InstructionDataWithHoldUpTime } from 'actions/createProposal'
import useQueryContext from '@hooks/useQueryContext'
import { useRouter } from 'next/router'
import { notify } from '@utils/notifications'
import useRealm from '@hooks/useRealm'
import React, { useEffect, useState } from 'react'
import Button from '@components/Button'
import * as yup from 'yup'
import { useDropzone } from 'react-dropzone'
import { AssetAccount } from '@utils/uiTypes/assets'
import GovernedAccountSelect from '@components/inputs/GovernedAccountSelect'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import { AccountType } from '@utils/uiTypes/assets'
import { WebBundlr } from '@bundlr-network/client'
import { WebSolana } from "@irys/web-upload-solana"
import { WebUploader } from "@irys/web-upload";
import { PublicKey } from '@solana/web3.js'
import { Metaplex } from '@metaplex-foundation/js'
import useWalletOnePointOh from '@hooks/useWalletOnePointOh'
import { useRealmQuery } from '@hooks/queries/realm'
import useLegacyConnectionContext from '@hooks/useLegacyConnectionContext'
import { useVoteByCouncilToggle } from '@hooks/useVoteByCouncilToggle'

interface GovernanceConfigForm {
  mintAccount: AssetAccount | undefined
  name: string
  symbol: string
  description: string
}

const MetadataCreationModal = ({
  closeModal,
  isOpen,
  governance,
  initialMintAccount,
}: {
  closeModal: () => void
  isOpen: boolean
  governance: ProgramAccount<Governance>
  initialMintAccount?: AssetAccount | undefined
}) => {
  const router = useRouter()
  const realm = useRealmQuery().data?.result
  const { symbol, realmInfo } = useRealm()
  const programId: PublicKey | undefined = realmInfo?.programId

  const { assetAccounts } = useGovernanceAssets()
  const connection = useLegacyConnectionContext()
  const mintGovernancesWithMintInfo = assetAccounts.filter((x) => {
    return x.type === AccountType.MINT
  })
  const shouldBeGoverned = false
  const { fmtUrlWithCluster } = useQueryContext()
  const wallet = useWalletOnePointOh()
  const { handleCreateProposal } = useCreateProposal()
  const [formErrors, setFormErrors] = useState({})
  const [creatingProposal, setCreatingProposal] = useState(false)
  const { voteByCouncil, shouldShowVoteByCouncilToggle, setVoteByCouncil } =
    useVoteByCouncilToggle()
  const [selectedImage, setSelectedImage] = useState<null | string>(null)
  const [imageFile, setImageFile] = useState<null | Buffer>(null)
  const [mintAuthority, setMintAuthority] = useState<
    PublicKey | null | undefined
  >(undefined)
  const [payerSolTreasury, setPayerSolTreasury] = useState<
    PublicKey | null | undefined
  >(undefined)
  const [shouldMakeSolTreasury, setShouldMakeSolTreasury] = useState(false)
  const [form, setForm] = useState<GovernanceConfigForm>({
    mintAccount: initialMintAccount,
    name: '',
    symbol: '',
    description: '',
  })
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': [],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDrop: (acceptedFiles) => {
      const reader = new FileReader()
      const file = acceptedFiles[0]
      if (file) {
        setSelectedImage(URL.createObjectURL(file))
        reader.onload = function () {
          if (reader.result) {
            setImageFile(Buffer.from(reader.result as ArrayBuffer))
          }
        }
        reader.readAsArrayBuffer(file)
      }
    },
  })
  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({ ...form!, [propertyName]: value })
  }
  const schema = yup.object().shape({})

  const handleCreate = async () => {
    const isValid = await validateInstruction({ schema, form, setFormErrors })
    if (isValid && governance?.account && wallet?.publicKey && realm) {
      setCreatingProposal(true)
      const arweaveImageUrl = await uploadImage()
      const arweaveMetadataUrl = await uploadJson(arweaveImageUrl!)
      const isCurrentMetadataExist = await checkCurrentMetadataExist()
      let obj: UiInstruction
      if (isCurrentMetadataExist) {
        obj = await getUpdateTokenMetadataInstruction({
          schema,
          form: {
            ...form,
            uri: arweaveMetadataUrl,
          },
          programId,
          governedMintInfoAccount: form.mintAccount,
          setFormErrors,
          mintAuthority,
        })
      } else {
        obj = await getCreateTokenMetadataInstruction({
          schema,
          form: {
            ...form,
            uri: arweaveMetadataUrl,
          },
          programId,
          connection,
          wallet,
          governedMintInfoAccount: form.mintAccount,
          setFormErrors,
          mintAuthority,
          payerSolTreasury,
          shouldMakeSolTreasury,
        })
      }
      const instructionData = new InstructionDataWithHoldUpTime({
        instruction: obj,
        governance,
      })

      try {
        if (form.mintAccount?.governance) {
          const proposalAddress = await handleCreateProposal({
            title: isCurrentMetadataExist
              ? `Update metadata for ${form.mintAccount?.pubkey.toString()}`
              : `Create metadata for ${form.mintAccount?.pubkey.toString()}`,
            description: form!.description ? form!.description : '',
            voteByCouncil,
            instructionsData: [instructionData],
            governance: form.mintAccount?.governance,
          })
          const url = fmtUrlWithCluster(
            `/dao/${symbol}/proposal/${proposalAddress}`,
          )
          router.push(url)
        } else {
          throw new Error('Governance not exist')
        }
      } catch (ex) {
        notify({ type: 'error', message: `${ex}` })
      }

      setCreatingProposal(false)
    }
  }
  const initBundlr = async () => {
    const bundlr = new WebBundlr(
      connection.cluster == 'devnet'
        ? 'https://devnet.bundlr.network'
        : 'https://node1.bundlr.network',
      'solana',
      wallet,
      {
        providerUrl: connection.current.rpcEndpoint,
      },
    )
    try {
      await bundlr.utils.getBundlerAddress('solana')
    } catch {
      return
    }
    try {
      await bundlr.ready()
    } catch {
      return
    }
    if (!bundlr.address) {
      return
    }
    return bundlr
  }

  const uploadImage = async () => {
    const irysUploader = await WebUploader(WebSolana).withProvider(wallet).withRpc(connection.endpoint);
    if (imageFile == null) return

    const loadedBalance = await irysUploader.getBalance()
    const balance = irysUploader.utils.fromAtomic(loadedBalance)
    const balanceNum = balance.toNumber()

    const price = await irysUploader.utils.getPrice('solana', imageFile.length)
    const amount = irysUploader.utils.fromAtomic(price)
    const amountNum = amount.toNumber()

    if (balanceNum < amountNum) {
      await irysUploader.fund(Math.ceil((amountNum - balanceNum)))
    }

    const imageResult = await irysUploader.uploader.uploadData(imageFile)

    const arweaveImageUrl = `https://gateway.irys.xyz/${imageResult.id}`
    return arweaveImageUrl
  }

  const uploadJson = async (arweaveImageUrl: string) => {
    const tokenMetadata = {
      name: form.name,
      symbol: form.symbol,
      description: form.description,
      image: arweaveImageUrl,
    }
    const tokenMetadataJsonString = JSON.stringify(tokenMetadata)
    const irysUploader = await WebUploader(WebSolana).withProvider(wallet).withRpc(connection.endpoint);
    if (tokenMetadataJsonString == null) return

    const tokenMetadataJson = Buffer.from(tokenMetadataJsonString)
    const loadedBalance = await irysUploader.getBalance()
    const balance = irysUploader.utils.fromAtomic(loadedBalance)
    const balanceNum = balance.toNumber()

    const price = await irysUploader.utils.getPrice(
      'solana',
      tokenMetadataJson.length,
    )
    const amount = irysUploader.utils.fromAtomic(price)
    const amountNum = amount.toNumber()
    
    if (balanceNum < amountNum) {
      await irysUploader.fund(Math.ceil((amountNum - balanceNum)))
    }

    const metadataResult = await irysUploader.uploader.uploadData(tokenMetadataJson)

    const arweaveMetadataUrl = `https://gateway.irys.xyz/${metadataResult.id}`
    return arweaveMetadataUrl
  }

  const checkCurrentMetadataExist = async () => {
    if (form.mintAccount) {
      try {
        const metaplex = new Metaplex(connection.current)
        const metadataPDA = await metaplex
          .nfts()
          .pdas()
          .metadata({ mint: form.mintAccount.pubkey })
        const tokenMetadata = await metaplex.nfts().findByMetadata({
          metadata: metadataPDA,
        })
        if (tokenMetadata) return true
        return false
      } catch (e) {
        return false
      }
    }
    return false
  }

  useEffect(() => {
    setMintAuthority(form?.mintAccount?.extensions.mint?.account.mintAuthority)
    const currentGovernanceSolTreasury = assetAccounts.filter(
      (x) =>
        x.governance.pubkey.toString() ===
          form.mintAccount?.governance.pubkey.toString() && x.isSol,
    )
    if (currentGovernanceSolTreasury.length !== 0) {
      setShouldMakeSolTreasury(false)
      const solTreasury = currentGovernanceSolTreasury[0].pubkey
      setPayerSolTreasury(solTreasury)
    } else if (form.mintAccount != null && governance != null) {
      setShouldMakeSolTreasury(true)
      setPayerSolTreasury(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [
    form,
    setMintAuthority,
    setShouldMakeSolTreasury,
    setPayerSolTreasury,
    assetAccounts,
  ])

  return (
    <Modal sizeClassName="sm:max-w-3xl" onClose={closeModal} isOpen={isOpen}>
      <div className="w-full space-y-4">
        <h3 className="flex flex-col mb-4">Create token metadata</h3>
        <GovernedAccountSelect
          label="Mint"
          governedAccounts={mintGovernancesWithMintInfo}
          onChange={(value) => {
            handleSetForm({ value, propertyName: 'mintAccount' })
          }}
          value={form.mintAccount}
          error={formErrors['mintAccount']}
          shouldBeGoverned={shouldBeGoverned}
          governance={governance}
        />
        <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
          <div className="mt-1 sm:mt-0 sm:col-span-1">
            <div
              {...getRootProps({
                className:
                  'max-w-lg flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer',
              })}
            >
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="image-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary-dark hover:text-primary-light focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload an image</span>
                    <input {...getInputProps()} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                {!selectedImage ? null : (
                  <img src={selectedImage} className="w-32 m-auto" />
                )}
              </div>
            </div>
          </div>
        </div>
        <Input
          label="Name"
          placeholder={'Token name'}
          value={form?.name}
          type="text"
          error={formErrors['name']}
          onChange={(evt) =>
            handleSetForm({
              value: evt.target.value,
              propertyName: 'name',
            })
          }
        />
        <Input
          label="Symbol"
          placeholder={'Token symbol like "USDC"'}
          value={form?.symbol}
          type="text"
          error={formErrors['symbol']}
          onChange={(evt) =>
            handleSetForm({
              value: evt.target.value,
              propertyName: 'symbol',
            })
          }
        />
        <Textarea
          label="Description"
          placeholder="Description of the token"
          value={form?.description}
          onChange={(evt) =>
            handleSetForm({
              value: evt.target.value,
              propertyName: 'description',
            })
          }
        ></Textarea>

        {shouldShowVoteByCouncilToggle && (
          <VoteBySwitch
            checked={voteByCouncil}
            onChange={() => {
              setVoteByCouncil(!voteByCouncil)
            }}
          ></VoteBySwitch>
        )}
      </div>
      <div className="flex justify-end pt-6 mt-6 space-x-4 border-t border-fgd-4">
        <Button
          isLoading={creatingProposal}
          disabled={creatingProposal}
          onClick={() => handleCreate()}
        >
          Add proposal
        </Button>
      </div>
    </Modal>
  )
}

export default MetadataCreationModal
