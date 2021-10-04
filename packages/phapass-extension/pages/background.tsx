import {create as createPhala, PhalaInstance, CertificateData, randomHex, signCertificate} from '@phala/sdk'
import {numberToHex, hexAddPrefix, u8aToHex} from '@polkadot/util'
import type {ApiPromise} from '@polkadot/api'
import {installMessageListener, openOptionsPage, sendNotification} from 'lib/chrome'
import {createApi} from 'lib/polkadotApi'
import { enablePolkadotExtension, getSigner } from 'lib/polkadotExtension'
import Head from 'next/head'
import {useCallback, useEffect, useState} from 'react'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'
import account from 'atoms/account'


const baseURL = '/'
const CONTRACT_ID = 7093

const BackgroundVault = ({api, phala}: {api: ApiPromise; phala: PhalaInstance}) => {
  console.log('BackgroundVault')
  
  const [certificate, setCertificate] = useState<CertificateData>()
  const [account, setAccount] = useState<InjectedAccountWithMeta>()
  
  // const onSignCertificate = useCallback(async () => {
  //   if (account) {
  //     setSignCertificateLoading(true)
  //     try {
  //       const signer = await getSigner(account)
  //       const certificate = await signCertificate({
  //           api,
  //           address: account.address,
  //           signer,
  //         })
  //       setCertificateData(certificate)
  //       sendMessage({command: "setCertificate", certificate})
  //       toaster.positive('Certificate signed', {})
  //     } catch (err) {
  //       toaster.negative((err as Error).message, {})
  //     }
  //     setSignCertificateLoading(false)
  //   }
  // }, [api, account])

  const onMessage =  async (request: any, sender: any, sendResponse: any) => {
    console.log(sender.tab ?
      "from a content script:" + sender.tab.url :
      "from the extension");
    console.log('request', request)
    const sanitizedUrl = sender.tab.url.split('?')[0];
    if (request.command === "get"){
        // const credential = vault.getCredentialForUrl(sanitizedUrl)
        // if (credential){
        // sendResponse(credential);
        // }else{
        sendResponse({error: `No credential for ${sanitizedUrl}`});
        // }
    } else if (request.command === "set"){
        sendNotification('Saving a new credential for ' + sanitizedUrl);
        enablePolkadotExtension().then(async (polkadotExtension) => {
          polkadotExtension.approveUs()
          const accounts =  await polkadotExtension.listAccounts()
          console.log(accounts)
          const accountsWithMeta: any[] = accounts.map(({ address, name }) =>
          ({ address, meta: { name: `${name}` } }));
          addCredential(accountsWithMeta[0], sanitizedUrl, request.username, request.password);
        })
    }
    if (request.command === "setCertificate"){
      console.log('request.certificate', request.certificate)
      setCertificate(request.certificate)
      onQueryVault(request.certificate)
    }
  }

  useEffect(() => {
    installMessageListener(onMessage);
    // openOptionsPage()
    enablePolkadotExtension().then(async (polkadotExtension) => {
      polkadotExtension.approveUs()
      const accounts =  await polkadotExtension.listAccounts()
      console.log(accounts)
      const accountsWithMeta: any[] = accounts.map(({ address, name }) =>
      ({ address, meta: { name: `${name}` } }));
      //setAccount(accountsWithMeta[0])
      onSignCertificate(accountsWithMeta[0])
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
        onQueryVault(certificate)
        // addCredential(account, "http://this.is.a.test", "admin", "test");
      } catch (err) {
        console.error(err);
      }
    }
  }

  const onQueryVault = (certificateData: CertificateData) => {
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
          console.log(ok);
          const result = ok.hasAVault
          sendNotification(`User has a vault : ${result}`)
          //getCredential(certificateData, 'http://this.is.a.test')
          
        }

        if (err) {
          throw new Error(err)
        }
      })
      .catch((err: any) => {
        console.error(err)
      })
  }

  const addCredential = async (account: InjectedAccountWithMeta, url: String, username: String, password: String) => {
    const signer = await getSigner(account)
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

  const getCredential = (certificateData: CertificateData, url: String) => {
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
          const {username, password} = ok
          sendNotification(`User has a credential : ${username}, ${password}`)
        }

        if (err) {
          throw new Error(err)
        }
      })
      .catch((err: any) => {
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
        // toaster.negative((err as Error).message, {})
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
