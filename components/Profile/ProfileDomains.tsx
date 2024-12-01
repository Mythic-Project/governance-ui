import React, { FC, useMemo } from 'react'
import { useProfile } from '@components/Profile/useProfile';
import { PublicKey } from '@solana/web3.js';
import ContentLoader from "react-content-loader";
import { ShortAddress } from "@components/Profile/ShortAddress";
import { useDomains } from './useDomains';

type Props = {
  publicKey: PublicKey, height?: string;
  width?: string;
  dark?: boolean;
  style?: React.CSSProperties;
}
export const ProfileDomains: FC<Props> = ({ publicKey, height = "13",
  width = "300",
  dark = false,
  style, }) => {

  const renderedDomains = useMemo(
    async () => {
      const { domains } = await useDomains(publicKey)
      return (
        <div>
          {domains.map(domain => {
            <div style={{ display: "flex", gap: "5px", ...style }}>
              {domain.domain || <ShortAddress address={domain.nameAccount} />}
            </div>
          })}
        </div>
      )
    },
    [publicKey]
  )

  return <>{renderedDomains}</>

}
