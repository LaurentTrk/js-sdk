import type {ApiPromise} from '@polkadot/api'
import {numberToHex, hexAddPrefix, u8aToHex} from '@polkadot/util'
import {createApi} from 'lib/polkadotApi'
import {FormEventHandler, useCallback, useEffect, useRef, useState} from 'react'
import {
  create as createPhala,
  randomHex,
  signCertificate,
  CertificateData,
  PhalaInstance,
} from '@phala/sdk'
import {Input} from 'baseui/input'
import {Button} from 'baseui/button'
import {toaster} from 'baseui/toast'
import {useAtom} from 'jotai'
import accountAtom from 'atoms/account'
import {getSigner} from 'lib/polkadotExtension'
import {FormControl} from 'baseui/form-control'
import {ProgressSteps, Step} from 'baseui/progress-steps'
import {LabelXSmall, ParagraphMedium} from 'baseui/typography'
import {StyledSpinnerNext} from 'baseui/spinner'
import {Block} from 'baseui/block'
import {ButtonGroup} from 'baseui/button-group'
import {decodeAddress} from '@polkadot/util-crypto'
import { sendMessage } from 'lib/chrome'

const baseURL = '/'
const CONTRACT_ID = 7093

const Vault = ({api, phala}: {api: ApiPromise; phala: PhalaInstance}) => {

  console.log('Vault')
  const [account] = useAtom(accountAtom)
  const [hasVault, setHasVault] = useState(false)
  const [certificateData, setCertificateData] = useState<CertificateData>()
  const [signCertificateLoading, setSignCertificateLoading] = useState(false)
  const [vaultLoading, setVaultLoading] = useState(false)
  const unsubscribe = useRef<() => void>()

  useEffect(() => {
    const _unsubscribe = unsubscribe.current
    return () => {
      api?.disconnect()
      _unsubscribe?.()
    }
  }, [api])

  useEffect(() => {
    setCertificateData(undefined)
  }, [account])

  const onSignCertificate = useCallback(async () => {
    if (account) {
      setSignCertificateLoading(true)
      try {
        const signer = await getSigner(account)
        const certificate = await signCertificate({
            api,
            address: account.address,
            signer,
          })
        setCertificateData(certificate)
        sendMessage({command: "setAccount", account})
        toaster.positive('Certificate signed', {})
      } catch (err) {
        toaster.negative((err as Error).message, {})
      }
      setSignCertificateLoading(false)
    }
  }, [api, account])

  const onQueryVault = useCallback(() => {
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

    const toastKey = toaster.info('Querying…', {autoHideDuration: 0})

    phala
      .query(encodedQuery, certificateData)
      .then((data) => {
        const {
          result: {ok, err},
        } = api
          .createType('PhapassResponse', hexAddPrefix(data))
          .toJSON() as any

        if (ok) {
          console.log(ok);
          const result = ok.hasAVault
          toaster.update(toastKey, {
            children: `Use has a vault : ${result}`,
            autoHideDuration: 3000,
          })
        }

        if (err) {
          throw new Error(err)
        }
      })
      .catch((err) => {
        toaster.update(toastKey, {
          kind: 'negative',
          children: (err as Error).message,
          autoHideDuration: 3000,
        })
      })
  }, [phala, api, certificateData])

  const onCreateVault = useCallback(async () => {
    if (!account) return
    const toastKey = toaster.info('Resetting…', {autoHideDuration: 0})
    const signer = await getSigner(account)
    const _unsubscribe = await phala
      .command({
        account,
        contractId: CONTRACT_ID,
        payload: api
          .createType('PhapassCommand', {CreateVault: null})
          .toHex(),
        signer,
        onStatus: (status) => {
          if (status.isFinalized) {
            toaster.update(toastKey, {
              kind: 'positive',
              children: 'Command Sent',
              autoHideDuration: 3000,
            })
          }
        },
      })
      .catch((err) => {
        toaster.update(toastKey, {
          kind: 'negative',
          children: (err as Error).message,
          autoHideDuration: 3000,
        })
      })

    if (_unsubscribe) {
      unsubscribe.current = _unsubscribe
    }
  }, [phala, api, account])

  return (
    <ProgressSteps
      current={certificateData ? 1 : 0}
      overrides={{
        Root: {
          style: {width: '100%'},
        },
      }}
    >
      <Step title="Sign Certificate">
        <ParagraphMedium>Click to sign a certificate first.</ParagraphMedium>
        <Button
          isLoading={signCertificateLoading}
          onClick={onSignCertificate}
          disabled={!account}
        >
          Sign Certificate
        </Button>
      </Step>
      <Step title="Play">
        <div>
          <ButtonGroup
            size="mini"
            overrides={{Root: {style: {marginTop: '16px'}}}}
          >
            <Button onClick={onQueryVault}>Query Vault</Button>
            <Button onClick={onCreateVault}>Create Vault</Button>
          </ButtonGroup>
        </div>
      </Step>
    </ProgressSteps>
  )
}

const PhaPass: Page = () => {
  console.log('PhaPass')
  const [api, setApi] = useState<ApiPromise>()
  const [phala, setPhala] = useState<PhalaInstance>()

  useEffect(() => {
    createApi({
      endpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT as string,
    })
      .then((api) => {
        setApi(api)
        return createPhala({api, baseURL}).then((phala) => {
          setPhala(() => phala)
        })
      })
      .catch((err) => {
        toaster.negative((err as Error).message, {})
      })
  }, [])

  if (api && phala) {
    return <Vault api={api} phala={phala} />
  }

  return (
    <Block
      display="flex"
      flexDirection="column"
      alignItems="center"
      height="280px"
      justifyContent="center"
    >
      <StyledSpinnerNext />
      <LabelXSmall marginTop="20px">Initializing</LabelXSmall>
    </Block>
  )
}

PhaPass.title = 'PhaPass'

export default PhaPass
