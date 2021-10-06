import {create as createPhala, PhalaInstance, CertificateData, randomHex, signCertificate} from '@phala/sdk'
import {numberToHex, hexAddPrefix, u8aToHex, u8aConcat, hexToU8a, stringToU8a, u8aToString, hexToString} from '@polkadot/util'
import type {ApiPromise} from '@polkadot/api'
import {cacheUserAccount, enableOptionsPageDisplayOnButtonClick, getCachedUserAccount, installMessageListener, openOptionsPage, sendNotification} from 'lib/chrome'
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

let theVaultSecret: Uint8Array|undefined = undefined

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
    if (theVaultSecret){
      const password = "This.is.a.long.secret.to.be.kept.secret"
      const encryptedPassword = encryptPassword(password, theVaultSecret)
      console.log('password', decryptPassword(encryptedPassword, theVaultSecret))
    }
  }, [])
    
  const setVaultSecrets = async (account: InjectedAccountWithMeta) => {
    if (!vaultPublicKey || !vaultSecretKeys){
      const { vaultKeyPair, vaultEncryptedKeys, vaultSecret } = createVaultSecrets(account)
      setVaultPublicKey(u8aToHex(vaultKeyPair.publicKey));
      setVaultPrivateKey(vaultKeyPair.secretKey);
      setVaultSecretKeys(u8aToHex(vaultEncryptedKeys));
      theVaultSecret = vaultSecret;
    }else{
      const { decryptedVaultSecret, decryptedVaultSecretKey } = await decryptVaultSecrets(account, vaultSecretKeys, vaultPublicKey)
      theVaultSecret = decryptedVaultSecret;
      setVaultPrivateKey(decryptedVaultSecretKey);
    }
  }  

  const onMessage =  (request: any, sender: any, sendResponse: any) => {
    console.log(sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
    console.log('request', request)
    console.log('certificate', certificate)
    const sanitizedUrl = sender.tab.url.split('?')[0];
    if (request.command === "get" && certificate){
        getCredential(certificate, sanitizedUrl, (credential: any) => {
          console.log('credential', credential)
          if (credential){
            sendResponse(credential);
          }else{
            sendResponse({error: `No credential for ${sanitizedUrl}`});
          }
        })
    } else if (request.command === "set"){
        // sendNotification('Saving a new credential for ' + sanitizedUrl);
        addCredential(account, sanitizedUrl, request.username, request.password);
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
          if (theVaultSecret){
            existingCredentials.password = decryptPassword('0x' + existingCredentials.password, theVaultSecret)
          }
          
          sendNotification(`Injecting your existing credential !`)
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

  const addCredential = async (account: InjectedAccountWithMeta, url: string, username: string, password: string) => {
    
    const encryptedPassword = theVaultSecret ? encryptPassword(password, theVaultSecret):undefined
    console.log('encryptedPassword', encryptedPassword as string)
    const signer = await getSigner(account)
    sendNotification('Saving the credential in your vault.\nPlease sign the transaction and wait...')
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
        onStatus: (status: any) => {
          if (status.isFinalized) {
            sendNotification('Credential has been saved !')
          }
        },
      })
      .catch((err:any) => {
        console.error(err)
      })
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
  const [vaultReady, setVaultReady] = useState<false>()

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
    console.log('certificate', certificate)
    const sanitizedUrl = sender.tab.url.split('?')[0];
    if (request.command === 'signCertificate'){
      onSignCertificate(request.account, (certificate: CertificateData, vaultAlreadyCreated: Boolean) => {
        sendResponse({certificate, vaultAlreadyCreated})
      })
    } else if (request.command === 'createVault'){
      createVault(request.account, (vaultCreated: Boolean) => {
        sendResponse({vaultCreated})
      })
    }
    return true
  }


  const onSignCertificate = async (account: InjectedAccountWithMeta, callback?: any ) => {
    if (account) {
      try {
        const signer = await getSigner(account)
        const certificate = await signCertificate({
            api,
            address: account.address,
            signer,
          })
        console.log('certificat', certificate)
        setCertificate(certificate)       
        setAccount(account)
        const vaultAlreadyCreated = await onQueryVault(certificate)
        setVaultReady(vaultAlreadyCreated)
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

  const createVault = async (account: InjectedAccountWithMeta, callback: any) => {
    if (!account) return
    sendNotification('Creating your private vault. Please wait...')
    const signer = await getSigner(account)
    await phala
      .command({
        account,
        contractId: CONTRACT_ID,
        payload: api
          .createType('PhapassCommand', {CreateVault: null})
          .toHex(),
        signer,
        onStatus: (status: any) => {
          if (status.isFinalized) {
            // sendNotification('Your vault has been created. Enjoy !')
            callback(true)
          }
        },
      })
      .catch((err: any) => {
        console.error(err)
        sendNotification('Something prevents us from creating your vault :(')
        callback(false)
      })
  }
  
  if (certificate && account && vaultReady) {
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
