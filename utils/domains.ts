import {
  getAllDomains,
  getDomainKey,
  MINT_PREFIX,
  NameRegistryState,
  NAME_TOKENIZER_ID,
  performReverseLookupBatch,
} from '@bonfida/spl-name-service'
import { splitDomainTld, TldParser } from '@onsol/tldparser'
import { Connection, ParsedAccountData, PublicKey } from '@solana/web3.js'

interface Domain {
  domainName: string | undefined
  domainAddress: string
  domainOwner: string
  type: 'sns' | 'alldomains'
}

export const resolveDomain = async (
  connection: Connection,
  domainName: string
) => {
  try {
    const [tld] = splitDomainTld(domainName);
    // Get the public key for the domain
    if (tld === '.sol') {
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
  const sns_domains = await getAllDomains(connection, pubkey)
  const results: Domain[] = []
  
  if (sns_domains.length > 0) {
    const reverse = await performReverseLookupBatch(connection, sns_domains)

    for (let i = 0; i < sns_domains.length; i++) {
      results.push({
        domainAddress: sns_domains[i].toBase58(),
        domainName: reverse[i] + '.sol',
        domainOwner: pubkey.toBase58(),
        type: 'sns',
      })
    }
  }
  return results
}
