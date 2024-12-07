import { Connection, PublicKey } from '@solana/web3.js'
import { NameAccountAndDomain, TldParser } from '@onsol/tldparser'

export const useDomains = async(
    publicKey: PublicKey
): Promise<{ domains:  NameAccountAndDomain[]}> => {
    const RPC_URL = 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(RPC_URL);
    const parser = new TldParser(connection);
    let allUserDomains = await parser.getParsedAllUserDomains(publicKey);
    return { domains: allUserDomains };
}
