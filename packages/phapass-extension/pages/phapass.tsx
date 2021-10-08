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
import {H4} from 'baseui/typography'
import {
  Card,
  StyledBody,
  StyledAction
} from "baseui/card";
import { Alert } from 'baseui/icon'

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
  const [credentials, setCredentials] = useState<any>()
  const unsubscribe = useRef<() => void>()

  useEffect(() => {
    sendMessage({command: "status"}, (response: any) => {
      console.log('status', response)
      if (response.hasVault === true){
        setTutorialFinished(true)
      }
    })
  }, [])

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

  useEffect(() => {
    sendMessage({command: "list"}, (response: any) => {
      setCredentials(response)
    })
  }, [tutorialFinished])


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
        setSignCertificateLoading(false)  
      })
      
    }
  }, [api, account])

  const onCreateVault = useCallback(async () => {
    if (account) {
      setVaultLoading(true)
      sendMessage({command: "createVault", account, certificate: certificateData}, (response: any) => {
        setHasVault(response.vaultCreated)
      })
      setVaultLoading(false)
    }
  }, [api, account])

  const letsGo = useCallback(async () => {
    setTutorialFinished(true)
  }, [api, account])

  const copyPasswordToClipboard = (url: string) => {
    sendMessage({command: "get", url}, (credential: any) => {
      navigator.clipboard.writeText(credential.password);
    })
  }

  const revealPassword = (url: string) => {
    // navigator.clipboard.writeText(row.username);
  }

  const forgetPassword = (url: string) => {
    sendMessage({command: "remove", url}, () => {
      console.log('Got remove credential answer')
      sendMessage({command: "list"}, (response: any) => {
        setCredentials(response)
      })
    })
  }

  if (tutorialFinished){
    return (
      <Block>
        <StyledBody>
          <b>Welcome to PhaPass</b>, the password manager which stores your secret credentials in the <a href='https://phala.network/'>Phala Blockchain</a>.<br/>
          <br/>
          Your personal and private vault is unlocked and ready to store the credential you will used during your browsing sessions.<br/>
          Enjoy !
        </StyledBody>
        <H4>Your credentials</H4>
        {(!credentials || credentials.length == 0)&& 
        <div>
          <StyledBody>
          No credential has been stored yet. 
          </StyledBody>
          <Button onClick={ () => { window.open("http://localhost:8080/auth/admin/", '_blank')}}>Let's visit our testing login page !</Button>
          </div>
        }
        {credentials && credentials.length > 0 && 
          <TableBuilder data={credentials}>
           <TableBuilderColumn header="Site">
              {row => <Link onClick={ ()=>{ window.open(row.url, '_blank')}}>{row.url}</Link>}
            </TableBuilderColumn>
            <TableBuilderColumn header="Username" numeric>
              {row => row.username}
            </TableBuilderColumn>
            <TableBuilderColumn header="Password" numeric>
              {row => <ButtonGroup size={SIZE.mini}>
                        {/* <StatefulPopover content={() => (<Block padding={"20px"}>{row.username}</Block>)}
                                        returnFocus
                                        autoFocus
                        >
                          <Button kind={KIND.secondary}
                                  size={BUTTONSIZE.mini}>Reveal</Button>
                        </StatefulPopover> */}
                        <Button onClick={() => { revealPassword(row.url) }}>Reveal</Button>
                        <Button onClick={() => { copyPasswordToClipboard(row.url) }}>Copy</Button>
                        <Button onClick={() => { forgetPassword(row.url) }}>Forget</Button>
                      </ButtonGroup>
              }
            </TableBuilderColumn>
          </TableBuilder>
        }
      <Disclaimer/>
    </Block>
    )
  }
  return (
    <div>
      <StyledBody>
        <b>Welcome to PhaPass</b>, the password manager which stores your secret credentials in the <a href='https://phala.network/'>Phala Blockchain</a>.<br/>
        It seems that your private vault has not been created yet, the following tutorial will help you to get started !.<br/>
      </StyledBody>


    <ProgressSteps
      current={vaultAccount ? certificateData ? hasVault ? 3 : 2 : 1 : 0}
      overrides={{
        Root: {
          style: {width: '100%'},
        },
      }}
    >
      <NumberedStep title="Choose Account">
        <ParagraphMedium>You need to choose the user account that will be linked to your vault.</ParagraphMedium>
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
          isLoading={vaultLoading}
          onClick={onCreateVault}
          disabled={!account}
        >
          Create your vault
        </Button>
      </NumberedStep>
      <NumberedStep title="Enjoy :)">
        <ParagraphMedium>Your personal and private vault has been created and is ready to hold your secret credentials :)</ParagraphMedium>
        <Button onClick={letsGo}>Let's go</Button>
      </NumberedStep>
    </ProgressSteps>
    <Disclaimer/>
    </div>
  )
}

const Disclaimer = () => {
  return (  
    <Block
    position="absolute"
    bottom="40px"
    alignItems="center"
    justifyContent="space-between"
  >
    <Card>
      <StyledBody>
        <b>Disclaimer</b> <br/>
        This project has been developed for the <a href='https://www.encode.club/polkadot-club-hackathon'>Polkadot Encode Hackathon 2021</a>.<br/>
        As a Hackathon project, it's still under development and is not ready for production nor personal use.<br/>
        <b>Use it at your own risks :)</b>
      </StyledBody>
    </Card>
  </Block>

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
      <LabelXSmall marginTop="20px">Please wait till we get connected to your personal vault :)</LabelXSmall>
    </Block>
  )
}

PhaPass.title = 'PhaPass, a password manager using the Phala Blockchain'

export default PhaPass
