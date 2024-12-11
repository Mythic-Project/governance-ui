import {
  getAllDomains,
  getDomainKey,
  MINT_PREFIX,
  NameRegistryState,
  NAME_TOKENIZER_ID,
  performReverseLookupBatch,
} from '@bonfida/spl-name-service'
import { TldParser } from '@onsol/tldparser'
import { Connection, ParsedAccountData, PublicKey } from '@solana/web3.js'

interface Domain {
  domainName: string | undefined
  domainAddress: string
  type: 'sns' | 'alldomains'
}

export const resolveDomain = async (
  connection: Connection,
  domainName: string
) => {
  try {
    // Get the public key for the domain
    if (domainName.includes('.sol')) {
      const { pubkey } = await getDomainKey(domainName)

      // Check if the domain is an NFT
      const [nftMintAddress] = await PublicKey.findProgramAddress(
        [MINT_PREFIX, pubkey.toBuffer()],
        NAME_TOKENIZER_ID
      )

      const nftAccountData = await connection.getParsedAccountInfo(
        nftMintAddress
      )

      if (
        nftAccountData.value?.data &&
        !Buffer.isBuffer(nftAccountData.value.data)
      ) {
        const parsedData: ParsedAccountData = nftAccountData.value.data

        if (
          parsedData.parsed.info.supply === '1' &&
          parsedData.parsed.info.isInitialized
        ) {
          const { value } = await connection.getTokenLargestAccounts(
            nftMintAddress
          )
          const nftHolder = value.find((e) => e.amount === '1')?.address

          if (!nftHolder) return undefined

          const holderInfo = await connection.getAccountInfo(nftHolder)

          if (!holderInfo || !holderInfo.data) {
            return undefined
          }

          return new PublicKey(holderInfo.data.slice(32, 64))
        }
      }

      console.log('Pubkey:', pubkey.toBase58())

      // Retrieve the domain's registry information
      const { registry } = await NameRegistryState.retrieve(connection, pubkey)

      return registry.owner
    } else {
      const parser = new TldParser(connection)
      const owner = await parser.getOwnerFromDomainTld(domainName)
      return owner
    }
  } catch (error) {
    console.error('Error resolving domain:', error)
    return undefined
  }
}

export const fetchDomainsByPubkey = async (
  connection: Connection,
  pubkey: PublicKey | undefined
) => {
  if (!pubkey) return []
  const parser = new TldParser(connection)
  const sns_domains = await getAllDomains(connection, pubkey)
  const tld_domains = await parser.getParsedAllUserDomains(pubkey)
  const results: Domain[] = []

  console.log('SNS domains:', sns_domains)
  console.log('TLD domains:', tld_domains)

  if (tld_domains.length > 0) {
    for (let i = 0; i < tld_domains.length; i++) {
      results.push({
        domainAddress: tld_domains[i].domain,
        domainName: tld_domains[i].nameAccount.toBase58(),
        type: 'alldomains',
      })
    }
  }

  if (sns_domains.length > 0) {
    const reverse = await performReverseLookupBatch(connection, sns_domains)

    for (let i = 0; i < sns_domains.length; i++) {
      results.push({
        domainAddress: sns_domains[i].toBase58(),
        domainName: reverse[i] + '.sol',
        type: 'sns',
      })
    }
  }
  return results
}
