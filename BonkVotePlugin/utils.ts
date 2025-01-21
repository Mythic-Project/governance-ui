import { web3 } from '@coral-xyz/anchor'

export function tokenRegistrarKey(
  realmAddress: web3.PublicKey,
  tokenMint: web3.PublicKey,
  programId: web3.PublicKey,
) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from('registrar'), realmAddress.toBuffer(), tokenMint.toBuffer()],
    programId,
  )[0]
}

export function tokenVwrKey(
  realmAddress: web3.PublicKey,
  tokenMint: web3.PublicKey,
  authority: web3.PublicKey,
  programId: web3.PublicKey,
) {
  const registrar = tokenRegistrarKey(realmAddress, tokenMint, programId)

  return web3.PublicKey.findProgramAddressSync(
    [
      registrar.toBytes(),
      Buffer.from('voter-weight-record'),
      authority.toBytes(),
    ],
    programId,
  )
}

export function tokenVoterKey(
  realmAddress: web3.PublicKey,
  tokenMint: web3.PublicKey,
  authority: web3.PublicKey,
  programId: web3.PublicKey,
) {
  const registrar = tokenRegistrarKey(realmAddress, tokenMint, programId)

  return web3.PublicKey.findProgramAddressSync(
    [registrar.toBytes(), Buffer.from('voter'), authority.toBytes()],
    programId,
  )
}

export function bonkRegistrarKey(
  realmAddress: web3.PublicKey,
  tokenMint: web3.PublicKey,
  programId: web3.PublicKey,
) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from('registrar'), realmAddress.toBuffer(), tokenMint.toBuffer()],
    programId,
  )[0]
}

export function bonkVwrKey(
  realmAddress: web3.PublicKey,
  tokenMint: web3.PublicKey,
  authority: web3.PublicKey,
  programId: web3.PublicKey,
) {
  return web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('voter-weight-record'),
      realmAddress.toBuffer(),
      tokenMint.toBuffer(),
      authority.toBytes(),
    ],
    programId,
  )
}

export function bonkSdrKey(
  voterWeightRecord: web3.PublicKey,
  programId: web3.PublicKey,
) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from('stake-deposit-record'), voterWeightRecord.toBuffer()],
    programId,
  )
}
