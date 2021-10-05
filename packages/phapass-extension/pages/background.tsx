import {create as createPhala, PhalaInstance, CertificateData, randomHex, signCertificate} from '@phala/sdk'
import {numberToHex, hexAddPrefix, u8aToHex} from '@polkadot/util'
import type {ApiPromise} from '@polkadot/api'
import {installMessageListener, openOptionsPage, sendNotification} from 'lib/chrome'
import {createApi} from 'lib/polkadotApi'
import { enablePolkadotExtension, getSigner } from 'lib/polkadotExtension'
import Head from 'next/head'
import {useCallback, useEffect, useState} from 'react'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'


const baseURL = '/'
const CONTRACT_ID = 7093

const BackgroundVaultReady = ({api, phala, account, certificate}: {api: ApiPromise; phala: PhalaInstance, account: InjectedAccountWithMeta, certificate: CertificateData}) => {
  console.log('BackgroundVaultReady')

  useEffect(() => {
    installMessageListener(onMessage);
  })
  
  
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
          sendNotification(`User has a credential : ${existingCredentials.username}, ${existingCredentials.password}`)
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

  const addCredential = async (account: InjectedAccountWithMeta, url: String, username: String, password: String) => {
    const signer = await getSigner(account)
    sendNotification('Saving the credential in your vault.\nPlease sign the transaction and wait...')
    const _unsubscribe = await phala
      .command({
        account,
        contractId: CONTRACT_ID,
        payload: api
          .createType('PhapassCommand', {AddCredential: {
            'url': url, 'username': username, 'password': password
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
  const [account, setAccount] = useState<InjectedAccountWithMeta>()
  
  useEffect(() => {
    enablePolkadotExtension().then(async (polkadotExtension) => {
      polkadotExtension.approveUs()
      const accounts =  await polkadotExtension.listAccounts()
      console.log(accounts)
      const accountsWithMeta: any[] = accounts.map(({ address, name }) =>
      ({ address, meta: { name: `${name}` } }));
      if (!certificate){
        onSignCertificate(accountsWithMeta[0])
      }
      
    })
  })

  const onSignCertificate = async (account: InjectedAccountWithMeta) => {
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
        onQueryVault(certificate, account)
      } catch (err) {
        console.error(err);
        sendNotification('Something wrong happen when signing your certificate :(')
      }
    }
  }

  const onQueryVault = (certificateData: CertificateData, account: InjectedAccountWithMeta) => {
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

    phala
      .query(encodedQuery, certificateData)
      .then((data: any) => {
        const {
          result: {ok, err},
        } = api
          .createType('PhapassResponse', hexAddPrefix(data))
          .toJSON() as any

        if (ok) {
          if (ok.hasAVault === true){
            sendNotification(`Your vault is unlocked.\n Enjoy !`)
          }else{
            // createVault(account);
            openOptionsPage()
          }
        }
      if (err) {
          throw new Error(err)
        }
      })
      .catch((err: any) => {
        console.error(err)
        sendNotification('PhaPass blockchain seems a little bit stuck :(')
      })
  }

  const createVault = async (account: InjectedAccountWithMeta) => {
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
            sendNotification('Your vault has been created. Enjoy !')
          }
        },
      })
      .catch((err: any) => {
        console.error(err)
        sendNotification('Something prevents us from creating your vault :(')
      })
  }
  
  if (certificate && account) {
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
