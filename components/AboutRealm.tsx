import useRealm from 'hooks/useRealm'
import useProgramVersion from '@hooks/useProgramVersion'
import { useGetOnchainMetadata } from '@hooks/useOnchainMetadata'

const AboutRealm = () => {
  const { realmInfo, symbol } = useRealm()
  const programVersion = useProgramVersion()
  const realmData = useGetOnchainMetadata(realmInfo?.realmId).data
  
  return (
    <div className="pb-4 space-y-3">
      <div>
        <p className="text-xs text-fgd-3">Name</p>
        <p className="text-fgd-1">{realmData?.displayName || realmInfo?.displayName || symbol}</p>
      </div>
      {realmInfo?.isCertified ? (
        <div>
          <p className="text-xs text-fgd-3">Token</p>
          <p className="text-fgd-1">{symbol}</p>
        </div>
      ) : null}
      {realmData?.shortDescription ? (
        <div>
          <p className="text-xs text-fgd-3">Description</p>
          <p className="text-fgd-1">{realmData.shortDescription}</p>
        </div>
      ) : null}
      {realmInfo?.website || realmData?.website ? (
        <div>
          <p className="text-xs text-fgd-3">Website</p>
          <a
            className="default-transition flex items-center text-primary-light hover:text-primary-dark text-sm"
            href={realmData?.website || realmInfo?.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            {realmData?.website || realmInfo?.website}
          </a>
        </div>
      ) : null}
      {realmInfo?.twitter || realmData?.twitter ? (
        <div>
          <p className="text-xs text-fgd-3">Twitter</p>
          <a
            className="default-transition flex items-center text-primary-light hover:text-primary-dark text-sm"
            href={`https://twitter.com/${realmData?.twitter || realmInfo?.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {realmData?.twitter || realmInfo?.twitter}
          </a>
        </div>
      ) : null}
      {realmData?.discord ? (
        <div>
          <p className="text-xs text-fgd-3">Discord</p>
          <a
            className="default-transition flex items-center text-primary-light hover:text-primary-dark text-sm"
            href={`${realmData.discord}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {realmData.discord}
          </a>
        </div>
      ) : null}
      {realmData?.category ? (
        <div>
          <p className="text-xs text-fgd-3">Category</p>
          <p className="text-fgd-1">{realmData.category}</p>
        </div>
      ) : null}
      {realmData?.keywords ? (
        <div>
          <p className="text-xs text-fgd-3">Keywords</p>
          <p className="text-fgd-1">{realmData.keywords}</p>
        </div>
      ) : null}
      <div>
        <p className="text-xs text-fgd-3">Program Version</p>
        <p className="text-fgd-1">{programVersion}</p>
      </div>
    </div>
  )
}

export default AboutRealm
