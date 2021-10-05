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
import {Button, SIZE as BUTTONSIZE, KIND} from 'baseui/button'
import {toaster} from 'baseui/toast'
import {useAtom} from 'jotai'
import accountAtom from 'atoms/account'
import {getSigner} from 'lib/polkadotExtension'
import {FormControl} from 'baseui/form-control'
import {ProgressSteps, NumberedStep} from 'baseui/progress-steps'
import {LabelXSmall, ParagraphMedium} from 'baseui/typography'
import {StyledSpinnerNext} from 'baseui/spinner'
import {Block} from 'baseui/block'
import {ButtonGroup, SIZE} from 'baseui/button-group'
import {decodeAddress} from '@polkadot/util-crypto'
import { sendMessage } from 'lib/chrome'
import AccountSelect from '../components/AccountSelect'
import { Table } from "baseui/table-semantic";
import {
  TableBuilder,
  TableBuilderColumn,
} from 'baseui/table-semantic';
import {StyledLink as Link} from 'baseui/link';
import { StatefulPopover } from "baseui/popover";
import {H3} from 'baseui/typography'

const baseURL = '/'
const CONTRACT_ID = 7093

const Vault = ({api, phala}: {api: ApiPromise; phala: PhalaInstance}) => {

  console.log('Vault')
  const [account] = useAtom(accountAtom)
  const [vaultAccount, setVaultAccount] = useState<any>()
  const [hasVault, setHasVault] = useState(false)
  const [certificateData, setCertificateData] = useState<CertificateData>()
  const [signCertificateLoading, setSignCertificateLoading] = useState(false)
  const [vaultLoading, setVaultLoading] = useState(false)
  const [tutorialFinished, setTutorialFinished] = useState(false)
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

  const onSelectVaultAccount = useCallback(async () => {
    if (account) {
      setVaultAccount(account)
    }
  }, [api, account])
  
  
  const onSignCertificate = useCallback(async () => {
    if (account) {
      setSignCertificateLoading(true)
      sendMessage({command: "signCertificate", account}, (response: any) => {
        setCertificateData(response.certificate)
        setHasVault(response.vaultAlreadyCreated)
      })
      setSignCertificateLoading(false)
    }
  }, [api, account])

  
  const letsGo = useCallback(async () => {
    setTutorialFinished(true)
  }, [api, account])

  if (true || tutorialFinished){
    return     (
      <Block>
        <H3>Your credentials</H3>
      <TableBuilder data={[
        {
          url: "https://github.com",
          username: "LaurentTrk",
          password: "100 Broadway St., New York City, New York"
        },
        {
          url: "http://localhost:8080",
          username: "admin",
          password: "100 Market St., San Francisco, California"
        }
      ]}>
      <TableBuilderColumn header="Site">
        {row => <Link onClick={ ()=>{ window.open(row.url, '_blank')}}>{row.url}</Link>}
      </TableBuilderColumn>
      <TableBuilderColumn header="Username" numeric>
        {row => row.username}
      </TableBuilderColumn>
      <TableBuilderColumn header="Password" numeric>
        {row => <ButtonGroup size={SIZE.mini}>
                  <StatefulPopover content={() => (<Block padding={"20px"}>{row.password}</Block>)}
                                   returnFocus
                                   autoFocus
                  >
                    <Button kind={KIND.secondary}
                            size={BUTTONSIZE.mini}>Reveal</Button>
                  </StatefulPopover>
                  <Button onClick={() => { navigator.clipboard.writeText(row.password); }}>Copy</Button>
                </ButtonGroup>
        }
      </TableBuilderColumn>
    </TableBuilder>
    </Block>
      
      )
  }
  return (
    <ProgressSteps
      current={vaultAccount ? certificateData ? hasVault ? 3 : 2 : 1 : 0}
      overrides={{
        Root: {
          style: {width: '100%'},
        },
      }}
    >
      <NumberedStep title="Choose Account">
        <ParagraphMedium>You need to choose the user account that will be linked with your vault.</ParagraphMedium>
          <AccountSelect/>
          <Button
            onClick={onSelectVaultAccount}
            disabled={vaultAccount}
            >
            Select this account
          </Button>
      </NumberedStep>
      <NumberedStep title="Sign Certificate">
        <ParagraphMedium>In order to access your vault, you are required to sign a certificate.</ParagraphMedium>
        <Button
          isLoading={signCertificateLoading}
          onClick={onSignCertificate}
          disabled={!account}
        >
          Sign your certificate
        </Button>
      </NumberedStep>
      <NumberedStep title="Create Vault">
        <ParagraphMedium>Your personal and private vault will hold your credentials.</ParagraphMedium>
        <Button
          isLoading={signCertificateLoading}
          onClick={onSignCertificate}
          disabled={!account}
        >
          Create your vault
        </Button>
      </NumberedStep>
      <NumberedStep title="Enjoy :)">
        <ParagraphMedium>Your personal and private vault has been created and is ready to hold your secret credential :)</ParagraphMedium>
        <Button onClick={letsGo}>Let's go</Button>
      </NumberedStep>
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

PhaPass.title = 'PhaPass, a password manager using the Phala Blockchain'

export default PhaPass
