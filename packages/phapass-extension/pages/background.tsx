import {create as createPhala, PhalaInstance, CertificateData, signCertificate} from '@phala/sdk'
import type {ApiPromise} from '@polkadot/api'
import { closeNotification, enableOptionsPageDisplayOnButtonClick, installMessageListener, openOptionsPage, sendLengthyNotification, sendMessage, sendNotification
} from 'lib/chrome'
import {createApi} from 'lib/polkadotApi'
import { getSigner } from 'lib/polkadotExtension'
import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import accountAtom from 'atoms/account'
import { useAtom } from 'jotai'
import { decryptVaultSecrets } from 'lib/crypto'
import { pruntime_rpc } from '@phala/sdk/esm/proto'
import vault from '../lib/vault'


const baseURL = '/'

const BackgroundVault = ({api, phala}: {api: ApiPromise; phala: PhalaInstance}) => {
  console.log('BackgroundVault')
  
  const [account, setAccount] = useAtom(accountAtom)

  useEffect(() => {   
    
    vault.setApi(api)
    vault.setPhala(phala)
    enableOptionsPageDisplayOnButtonClick()
    installMessageListener(onMessageFromOptionsPage)
    installMessageListener(onMessageFromContentScript)
        
    if (account){
      vault.setAccount(account)
      if (vault.state?.account){
        if (vault.state?.certificate){
          if (!vault.state?.secret){
            unlockVaultIfNeeded(vault.state?.account)
          }
        } else {
          onSignCertificate(vault.state?.account)
        }
      }
    }else{
      openOptionsPage()
    }

  }, [])

  const onMessageFromOptionsPage =  (request: any, sender: any, sendResponse: any) => {
    console.log("onMessageFromOptionsPage " + sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
  if (request.command === 'signCertificate'){
      onSignCertificate(request.account, (certificate: CertificateData, vaultAlreadyCreated: Boolean) => {
        sendResponse({certificate, vaultAlreadyCreated})
      })
    } else if (request.command === 'createVault'){
      createVault(sendResponse)
    } else if (request.command === "status"){
      sendResponse({certificate: vault.state?.certificate, account: vault.state?.account, hasVault: vault.userVaultIsReady()});
    }
    return true
  }

  const onMessageFromContentScript =  async (request: any, sender: any, sendResponse: any) => {
    console.log("onMessageFromContentScript " + sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
    const sanitizedUrl = sender.tab.url.split('#')[0].split('?')[0];
    const url = request.hasOwnProperty('url') ? request.url : sanitizedUrl
    if (request.command === "get" && vault.state?.certificate){
        const credential = await vault.getCredential(url)
        if (credential){
          sendResponse(credential);
        }else{
          sendResponse({error: `No credential for ${url}`});
        }
    } else if (request.command === "set"){
        addCredential(url, request.username, request.password, sendResponse);
    } else if (request.command === "remove"){
      removeCredential(url, sendResponse)
    } else if (request.command === "list"){
      sendResponse(await vault.listCredentials())
    }
    return true
  }

  const unlockVaultIfNeeded = async (account: InjectedAccountWithMeta) => {
    if (!vault.secretIsSet()){
      const notificationId = await sendLengthyNotification('Please decrypt these few bytes to unlock your vault :)')
      try{
        const vaultKeys = await vault.getKeys()
        if (vaultKeys){
          const vaultPublicKey = vaultKeys.slice(0, 32); 
          const vaultSecretKeys = vaultKeys.slice(32, vaultKeys.length); 
          const { decryptedVaultSecret, decryptedVaultSecretKey } = await decryptVaultSecrets(account, vaultSecretKeys, vaultPublicKey)
          vault.setSecret(decryptedVaultSecret);
          closeNotification(notificationId)
          sendNotification('Your vault is unlocked, enjoy !')
        }
      } catch (err) {
        console.error(err);
        closeNotification(notificationId)
        sendNotification('Something wrong happen when unlocking your vault :(')
      }
    }
  }  


  const createVault = async (sendResponse: any) => {
    let notificationId = await sendLengthyNotification('Please sign the transaction to create your vault.')
    const onStatus = async (status: any) => {
      if (!status.isFinalized && !status.isCompleted) {
        closeNotification(notificationId)
        notificationId = await sendLengthyNotification('Please wait, your vault is being created...')
      }
    }
    vault.createVault(onStatus).then((vaultCreated)=>{
      closeNotification(notificationId)
      sendResponse(vaultCreated)
    }).catch(() => {
      closeNotification(notificationId)
      sendNotification('Something prevents us from creating your vault :(')
    })
  }


  const onSignCertificate = async (account: InjectedAccountWithMeta, callback?: any ) => {
    if (account) {
      const notificationId = await sendLengthyNotification('You need to sign your certificate to access your vault.')
      try {
        const signer = await getSigner(account)
        // setAccount(account)
        console.log('signer', signer)
        const certificate = await signCertificate({
            api,
            address: account.address,
            signature_type: pruntime_rpc.SignatureType.Ed25519WrapBytes,
            signer,
          })
        console.log('certificat', certificate)
        vault.setCertificate(certificate)
        vault.setAccount(account)
        const vaultAlreadyCreated = await vault.userHasVault()
        closeNotification(notificationId)
        if (callback){
          callback(certificate, vaultAlreadyCreated)
        }else{
            if (vaultAlreadyCreated && vault.state?.account){
              unlockVaultIfNeeded(vault.state?.account)
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

  const addCredential = async (url: string, username: string, password: string, sendResponse: any) => {
    let notificationId = await sendLengthyNotification('Please sign the transaction to add the credential to your vault')
    const onStatus = async (status: any) => {
      if (!status.isFinalized && !status.isCompleted) {
        closeNotification(notificationId)
        notificationId = await sendLengthyNotification('Please wait, your credential is being added...')
      }
    }
    vault.addCredential(url, username, password, onStatus).then(()=>{
      closeNotification(notificationId)
      sendNotification('Your credential has been saved !')
      sendResponse({})
      sendMessage({command: "updateCredentials"}, () => {
      })      
    }).catch(() => {
      closeNotification(notificationId)
      sendNotification('Something prevents us from removing your credential :(')
      sendResponse({})
    })
  }

  const removeCredential = async (url: string, sendResponse: any) => {
    let notificationId = await sendLengthyNotification('Please sign the transaction to remove your credential.')
    const onStatus = async (status: any) => {
      if (!status.isFinalized && !status.isCompleted) {
        closeNotification(notificationId)
        notificationId = await sendLengthyNotification('Please wait, your credential is being removed...')
      }
    }
    vault.removeCredential(url, onStatus).then(()=>{
      closeNotification(notificationId)
      sendNotification('Your credential has been removed !')
      sendResponse({})
    }).catch(() => {
      closeNotification(notificationId)
      sendNotification('Something prevents us from removing your credential :(')
      sendResponse({})
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


const Background: Page = () => {
  console.log('Home')

  const [api, setApi] = useState<ApiPromise>()
  const [phala, setPhala] = useState<PhalaInstance>()
  const unsubscribe = useRef<() => void>()
  
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

  useEffect(() => {
    const _unsubscribe = unsubscribe.current
    return () => {
      api?.disconnect()
      _unsubscribe?.()
    }
  }, [api])

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
