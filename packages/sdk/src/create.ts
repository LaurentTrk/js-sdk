import axios from 'axios'
import type {ApiPromise} from '@polkadot/api'
import {
  u8aToHex,
  hexToU8a,
  hexAddPrefix,
  numberToHex,
  stringToHex,
  hexStripPrefix,
} from '@polkadot/util'
import {
  waitReady,
  sr25519KeypairFromSeed,
  sr25519Sign,
  sr25519Agree,
} from '@polkadot/wasm-crypto'
import {encrypt, decrypt} from './lib/aes-256-gcm'
import {randomHex} from './lib/hex'
import type {CertificateData} from './certificate'
import {pruntime_rpc, prpc} from './proto'
import type {Signer, Callback, ISubmittableResult} from '@polkadot/types/types'

export type Query = (
  encodedQuery: string,
  certificateData: CertificateData
) => Promise<string>

type EncryptedData = {
  iv: string
  pubkey: string
  data: string
}

type CreateEncryptedData = (data: string) => EncryptedData

export type Command = (params: {
  contractId: number
  payload: string
  account: {address: string}
  signer: Signer
  onStatus?: Callback<ISubmittableResult>
}) => Promise<() => void>

export interface PhalaInstance {
  query: Query
  command: Command
}

type CreateFn = (options: {
  api: ApiPromise
  baseURL: string
}) => Promise<PhalaInstance>

// TODO: refactor to individual functions
export const create: CreateFn = async ({api, baseURL}) => {
  await waitReady()

  // Create a http client prepared for protobuf
  const http = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    responseType: 'arraybuffer',
  }).post

  const getPhactoryUrl = (uri: string) => {
    console.log('get url for ', uri)
    if (uri.startsWith('/')){
      return 'http://localhost:8000' + uri
    }
    return uri
  }

  // Get public key from remote for encrypting
  console.log('Getting info');
  const factoryInfo = pruntime_rpc.PhactoryInfo.decode(
    new Uint8Array((await http<ArrayBuffer>(getPhactoryUrl('/prpc/PhactoryAPI.GetInfo'))).data)
  )
  // const factoryInfo = pruntime_rpc.PhactoryInfo.decode(
  //   new Uint8Array((await http<ArrayBuffer>('/prpc/PhactoryAPI.GetInfo')).data)
  // )
  console.log('factoryInfo', factoryInfo);
  console.log('initialized', factoryInfo.initialized);
  console.log('registered', factoryInfo.registered);
  const public_key = factoryInfo.public_key;
  if (!public_key) throw new Error('No remote pubkey')
  const remotePubkey = hexAddPrefix(public_key)

  // Create a query instance with protobuf set
  const contractQuery = (data: pruntime_rpc.IContractQueryRequest) =>
    http<ArrayBuffer>(getPhactoryUrl('/prpc/PhactoryAPI.ContractQuery'), data, {
      transformRequest: (data: pruntime_rpc.IContractQueryRequest) =>
        pruntime_rpc.ContractQueryRequest.encode(data).finish(),
    })
      .then((res) => {
        return {
          ...res,
          data: pruntime_rpc.ContractQueryResponse.decode(
            new Uint8Array(res.data)
          ),
        }
      })
      .catch((err) => {
        if (err.response?.data instanceof ArrayBuffer) {
          const message = new Uint8Array(err.response.data)
          throw new Error(prpc.PrpcError.decode(message).message)
        }

        throw err
      })

  // Generate a keypair for encryption
  // NOTE: each instance only has a pre-generated pair now, it maybe better to generate a new keypair every time encrypting
  const seed = hexToU8a(hexAddPrefix(randomHex(32)))
  const pair = sr25519KeypairFromSeed(seed)
  const [sk, pk] = [pair.slice(0, 64), pair.slice(64)]
  const iv = hexAddPrefix(randomHex(12))
  const agreementKey = sr25519Agree(hexToU8a(hexAddPrefix(remotePubkey)), sk)

  const createEncryptedData: CreateEncryptedData = (data) => ({
    iv,
    pubkey: u8aToHex(pk),
    data: hexAddPrefix(encrypt(data, agreementKey, hexToU8a(iv))),
  })

  const query: Query = async (encodedQuery, {certificate, pubkey, secret}) => {
    // Encrypt the ContractQuery.
    const encryptedData = createEncryptedData(encodedQuery)
    const encodedEncryptedData = api
      .createType('EncryptedData', encryptedData)
      .toU8a()

    // Sign the encrypted data.
    const signature: pruntime_rpc.ISignature = {
      signed_by: certificate,
      signature_type: pruntime_rpc.SignatureType.Sr25519,
      signature: sr25519Sign(pubkey, secret, encodedEncryptedData),
    }

    // Send request.
    const requestData = {
      encoded_encrypted_data: encodedEncryptedData,
      signature,
    }
    return contractQuery(requestData).then((res) => {
      const encodedEncryptedData = res.data.encoded_encrypted_data
      const {data: encryptedData, iv} = api
        .createType('EncryptedData', encodedEncryptedData)
        .toJSON() as {
        iv: string
        data: string
      }
      const data = decrypt(encryptedData, agreementKey, iv)
      return hexAddPrefix(data)
    })
  }

  const command: Command = async ({
    contractId,
    account,
    payload,
    signer,
    onStatus,
  }) => {
    const encodedPayload = api
      .createType('CommandPayload', {
        encrypted: createEncryptedData(payload),
      })
      .toHex()

    return api.tx.phalaMq
      .pushMessage(
        stringToHex(
          `phala/contract/${hexStripPrefix(
            numberToHex(contractId, 256)
          )}/command`
        ),
        encodedPayload
      )
      .signAndSend(account.address, {signer}, onStatus)
  }

  return {query, command, createEncryptedData}
}
