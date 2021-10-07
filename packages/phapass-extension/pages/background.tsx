import {create as createPhala, PhalaInstance, CertificateData, randomHex, signCertificate} from '@phala/sdk'
import {numberToHex, hexAddPrefix, u8aToHex, u8aConcat, hexToU8a, stringToU8a, u8aToString, hexToString} from '@polkadot/util'
import type {ApiPromise} from '@polkadot/api'
import {cacheUserAccount, closeNotification, enableOptionsPageDisplayOnButtonClick, getCachedUserAccount, installMessageListener, openOptionsPage, sendLengthyNotification, sendNotification} from 'lib/chrome'
import {createApi} from 'lib/polkadotApi'
import { enablePolkadotExtension, getSigner } from 'lib/polkadotExtension'
import Head from 'next/head'
import {useCallback, useEffect, useState} from 'react'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import accountAtom from 'atoms/account'
import vaultPublicKeyAtom from 'atoms/vaultPublicKey'
import vaultSecretKeysAtom from 'atoms/vaultSecretKeys'
import {useAtom} from 'jotai'
import { HexString } from '@polkadot/util/types'
import { createVaultSecrets, decryptPassword, decryptVaultSecrets, encryptPassword } from 'lib/crypto'
import { pruntime_rpc } from '@phala/sdk/esm/proto'
const {
  mnemonicGenerate,
  mnemonicToMiniSecret,
  naclKeypairFromSeed,
  decodeAddress,
  naclDecrypt,
  naclEncrypt,
  randomAsU8a,
  convertPublicKeyToCurve25519, convertSecretKeyToCurve25519, naclSeal
} = require('@polkadot/util-crypto');  

const baseURL = '/'
const CONTRACT_ID = 7093

const vaultState = {
  secret: undefined,
  certificate: undefined,
  vaultReady: false
}
// let theVaultSecret: Uint8Array|undefined = undefined

const BackgroundVaultReady = ({api, phala, account, certificate}: {api: ApiPromise; phala: PhalaInstance, account: InjectedAccountWithMeta, certificate: CertificateData}) => {
  console.log('BackgroundVaultReady')

  // Public and encrypted keys are stored in local storage
  const [vaultPublicKey, setVaultPublicKey] = useAtom(vaultPublicKeyAtom)
  const [vaultSecretKeys, setVaultSecretKeys] = useAtom(vaultSecretKeysAtom)

  // Private values (after decryption) are stored in memory
  // const [vaultSecret, setVaultSecret] = useState<Uint8Array>()
  const [vaultPrivateKey, setVaultPrivateKey] = useState<Uint8Array>()

  useEffect(() => {
    enableOptionsPageDisplayOnButtonClick()
    console.log('BackgroundVaultReady - Installing message listener')
    installMessageListener(onMessage)
    setVaultSecrets(account);
  }, [])
  
  useEffect(() => {
    if (vaultState.secret){
      const password = "This.is.a.long.secret.to.be.kept.secret"
      const encryptedPassword = encryptPassword(password, vaultState.secret)
      console.log('password', decryptPassword(encryptedPassword, vaultState.secret))
    }
  }, [])
    
  const setVaultSecrets = async (account: InjectedAccountWithMeta) => {
    if (!vaultPublicKey || !vaultSecretKeys){
      const { vaultKeyPair, vaultEncryptedKeys, vaultSecret } = createVaultSecrets(account)
      setVaultPublicKey(u8aToHex(vaultKeyPair.publicKey));
      setVaultPrivateKey(vaultKeyPair.secretKey);
      setVaultSecretKeys(u8aToHex(vaultEncryptedKeys));
      vaultState.secret = vaultSecret;
    }else{
      const notificationId = await sendLengthyNotification('Please decrypt these few bytes to unlock your vault :)')
      try{
        const { decryptedVaultSecret, decryptedVaultSecretKey } = await decryptVaultSecrets(account, vaultSecretKeys, vaultPublicKey)
        vaultState.secret = decryptedVaultSecret as any;
        setVaultPrivateKey(decryptedVaultSecretKey);
        closeNotification(notificationId)
        sendNotification('Your vault is unlocked, enjoy !')
      } catch (err) {
        console.error(err);
        closeNotification(notificationId)
        sendNotification('Something wrong happen when signing your certificate :(')
      }
    }
  }  

  const onMessage =  async (request: any, sender: any, sendResponse: any) => {
    console.log(sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
    console.log('request', request)
    console.log('certificate', certificate)
    const sanitizedUrl = sender.tab.url.split('#')[0].split('?')[0];
    const url = request.hasOwnProperty('url') ? request.url : sanitizedUrl
    if (request.command === "get" && certificate){
        
        getCredential(certificate, url, (credential: any) => {
          console.log('credential', credential)
          if (credential){
            sendResponse(credential);
          }else{
            sendResponse({error: `No credential for ${url}`});
          }
        })
    } else if (request.command === "set"){
        addCredential(account, url, request.username, request.password);
      } else if (request.command === "remove"){
        removeCredential(account, url).then((response) => {
          console.log('Got remove credential answer')
          sendResponse(response)
        }
        )
        
    } else if (request.command === "list"){
        listCredentials(certificate, (credentials: any) => {
          sendResponse(credentials);
        })
    } else if (request.command === "status"){
        sendResponse({certificate, account, hasVault: true});
    }
    return true
  }

  const getCredential = async (certificateData: CertificateData, url: String, callback: any) => {
    if (!certificateData) return
    const encodedQuery = api
      .createType('PhapassRequest', {
        head: {
          id: numberToHex(CONTRACT_ID, 256),
          nonce: hexAddPrefix(randomHex(32)),
        },
        data: {getCredential: url},
      })
      .toHex()

      phala
      .query(encodedQuery, certificateData)
      .then((data: any) => {
        const {
          result: {ok, err},
        } = api
          .createType('PhapassResponse', hexAddPrefix(data))
          .toJSON() as any

        if (ok) {
          console.log(ok);
          const { existingCredentials } = ok
          console.log('existingCredentials.password', existingCredentials.password)
          if (vaultState.secret){
            existingCredentials.password = decryptPassword('0x' + existingCredentials.password, vaultState.secret)
          }
          callback(existingCredentials)
        }

        if (err) {
          throw new Error(err)
        }
      })
      .catch((err: any) => {
        console.error(err)
        callback(null)
      })
  }

  const listCredentials = async (certificateData: CertificateData, callback: any) => {
    if (!certificateData) return
    const encodedQuery = api
      .createType('PhapassRequest', {
        head: {
          id: numberToHex(CONTRACT_ID, 256),
          nonce: hexAddPrefix(randomHex(32)),
        },
        data: {listCredentials: null},
      })
      .toHex()

      phala
      .query(encodedQuery, certificateData)
      .then((data: any) => {
        const {
          result: {ok, err},
        } = api
          .createType('PhapassResponse', hexAddPrefix(data))
          .toJSON() as any

        if (ok) {
          console.log(ok);
          const { credentials } = ok
          console.log('existingCredentials', credentials)
          callback(credentials)
        }

        if (err) {
          throw new Error(err)
        }
      })
      .catch((err: any) => {
        console.error(err)
        callback(null)
      })
  }

  const addCredential = async (account: InjectedAccountWithMeta, url: string, username: string, password: string) => {
    
    const encryptedPassword = vaultState.secret ? encryptPassword(password, vaultState.secret):undefined
    console.log('encryptedPassword', encryptedPassword as string)
    const signer = await getSigner(account)
    let notificationId = await sendLengthyNotification('Please sign the transaction to add the credential to your vault')
    const _unsubscribe = await phala
      .command({
        account,
        contractId: CONTRACT_ID,
        payload: api
          .createType('PhapassCommand', {AddCredential: {
            'url': url, 'username': username, 'password': encryptedPassword?.slice(2)
          }})
          .toHex(),
        signer,
        onStatus: async (status: any) => {
          console.log('onStatus', status)
          if (status.isFinalized) {
            closeNotification(notificationId)
            sendNotification('Your credential has been saved !')
          }else if (!status.isCompleted) {
            closeNotification(notificationId)
            notificationId = await sendLengthyNotification('Please wait, the transaction is being processed...')
          }
        },
      })
      .catch((err:any) => {
        console.error(err)
      })
  }

  const removeCredential = async (account: InjectedAccountWithMeta, url: string) => {
    
    const signer = await getSigner(account)
    let notificationId = await sendLengthyNotification('Please sign the transaction to remove your credential.')
    const phalaCommandPromise = new Promise((resolve, reject) => {
      phala
      .command({
        account,
        contractId: CONTRACT_ID,
        payload: api
          .createType('PhapassCommand', {RemoveCredential: url
          })
          .toHex(),
        signer,
        onStatus: async (status: any) => {
          console.log('onStatus', status)
          if (status.isFinalized) {
            closeNotification(notificationId)
            sendNotification('Your credential has been removed !')
            resolve({})
          }else if (!status.isCompleted) {
            closeNotification(notificationId)
            notificationId = await sendLengthyNotification('Please wait, your credential is being removed...')
          }
        },
      })
      .catch((err:any) => {
        console.error(err)
        reject(err)
      })
    })
    return await phalaCommandPromise
  }

  return (
    <div>
      <Head>
        <title>Phala Password Manager Background Page</title>
      </Head>
    </div>
  )


}



const BackgroundVault = ({api, phala}: {api: ApiPromise; phala: PhalaInstance}) => {
  console.log('BackgroundVault')
  
  const [certificate, setCertificate] = useState<CertificateData>()
  const [account, setAccount] = useAtom(accountAtom)

  useEffect(() => {   
    console.log('BackgroundVault - Installing message listener')
    installMessageListener(onMessage)    
    if (account){
      if (!certificate){
        onSignCertificate(account)
      }
    }else{
      openOptionsPage()
    }
  }, [])

  const onMessage =  (request: any, sender: any, sendResponse: any) => {
    console.log(sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
    console.log('request', request)
    const sanitizedUrl = sender.tab.url.split('?')[0];
    if (request.command === 'signCertificate'){
      onSignCertificate(request.account, (certificate: CertificateData, vaultAlreadyCreated: Boolean) => {
        sendResponse({certificate, vaultAlreadyCreated})
      })
    } else if (request.command === 'createVault'){
      createVault(request.account, request.certificate, (vaultCreated: Boolean) => {
        sendResponse({vaultCreated})
      })
    } else if (request.command === "status"){
      sendResponse({certificate, account, hasVault: vaultState.vaultReady});
    }
  
    return true
  }


  const onSignCertificate = async (account: InjectedAccountWithMeta, callback?: any ) => {
    if (account) {
      const notificationId = await sendLengthyNotification('You need to sign your certificate to access your vault.')
      try {
        const signer = await getSigner(account)
        const certificate = await signCertificate({
            api,
            address: account.address,
            signature_type: pruntime_rpc.SignatureType.Ed25519WrapBytes,
            signer,
          })
        console.log('certificat', certificate)
        const vaultAlreadyCreated = await onQueryVault(certificate)
        vaultState.vaultReady = vaultAlreadyCreated
        setCertificate(certificate)       
        setAccount(account)
        closeNotification(notificationId)
        if (callback){
          callback(certificate, vaultAlreadyCreated)
        }else{
            if (vaultAlreadyCreated){
              sendNotification('Your vault is unlocked.\n Enjoy !')
            }else{
              openOptionsPage()
            }
        }
      } catch (err) {
        console.error(err);
        closeNotification(notificationId)
        sendNotification('Something wrong happen when signing your certificate :(')
      }
    }
    if (callback){
      callback(undefined, undefined)
    }
  }

  const onQueryVault = async (certificateData: CertificateData) => {
    if (!certificateData) return
    const encodedQuery = api
      .createType('PhapassRequest', {
        head: {
          id: numberToHex(CONTRACT_ID, 256),
          nonce: hexAddPrefix(randomHex(32)),
        },
        data: {hasAVault: null},
      })
      .toHex()

    const data: any  = await phala.query(encodedQuery, certificateData)
    const { result: {ok, err} } = api.createType('PhapassResponse', hexAddPrefix(data)).toJSON() as any
    
    if (ok) {
      return ok.hasAVault;
    }
    return false;
  }

  const createVault = async (account: InjectedAccountWithMeta, certificate: CertificateData, callback: any) => {
    if (!account) return
    let notificationId = await sendLengthyNotification('Please sign the transaction to create your vault.')
    const signer = await getSigner(account)
    await phala
      .command({
        account,
        contractId: CONTRACT_ID,
        payload: api
          .createType('PhapassCommand', {CreateVault: null})
          .toHex(),
        signer,
        onStatus: async (status: any) => {
          if (status.isFinalized) {
            // sendNotification('Your vault has been created. Enjoy !')
            console.log('createVault certificate', certificate)
            setCertificate(certificate)
            vaultState.vaultReady = true
            setAccount(account)
            callback(true)
            closeNotification(notificationId)
          }else if (!status.isCompleted) {
            closeNotification(notificationId)
            notificationId = await sendLengthyNotification('Please wait, your vault is being created...')
          }
        },
      })
      .catch((err: any) => {
        console.error(err)
        closeNotification(notificationId)
        sendNotification('Something prevents us from creating your vault :(')
        callback(false)
      })
  }
  
  if (certificate && account && vaultState.vaultReady) {
    return <BackgroundVaultReady api={api} phala={phala} account={account} certificate={certificate}/>
  }

  return (
    <div>
      <Head>
        <title>Phala Password Manager Background Page</title>
      </Head>
    </div>
  )

}


const Background: Page = () => {
  console.log('Home')

  const [api, setApi] = useState<ApiPromise>()
  const [phala, setPhala] = useState<PhalaInstance>()

  useEffect(() => {
    createApi({
      endpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT as string,
    })
      .then((api) => {
        setApi(api)
        return createPhala({api, baseURL}).then(async (phala: any) => {
          setPhala(() => phala)
        })
      })
      .catch((err) => {
        console.error(err)
        sendNotification('Something prevents us to connect to PhaPas Blockchain :(')
      })
  }, [])

  if (api && phala) {
    return <BackgroundVault api={api} phala={phala} />
  }

  return (
    <div>
      <Head>
        <title>Phala Password Manager Background Page</title>
      </Head>
    </div>
  )
}

export default Background
