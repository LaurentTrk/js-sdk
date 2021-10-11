import { useCallback, useState, FC } from 'react'
import { ProgressSteps, NumberedStep } from 'baseui/progress-steps'
import { ParagraphMedium} from 'baseui/typography'
import { CertificateData } from '@phala/sdk'
import { useAtom} from 'jotai'
import accountAtom from 'atoms/account'
import { StyledBody} from "baseui/card";
import AccountSelect from '../components/AccountSelect'
import { Button } from 'baseui/button'
import Disclaimer from 'components/Disclaimer'
import { sendMessage } from 'lib/chrome';

const Tutorial: FC<{letsGo: any}> = ({letsGo}) => {

  const [account] = useAtom(accountAtom)
  const [vaultAccount, setVaultAccount] = useState<any>()
  const [hasVault, setHasVault] = useState(false)
  const [signCertificateLoading, setSignCertificateLoading] = useState(false)
  const [vaultLoading, setVaultLoading] = useState(false)
  const [certificateData, setCertificateData] = useState<CertificateData>()

    const onSelectVaultAccount = useCallback(async () => {
      if (account) {
        setVaultAccount(account)
      }
    }, [account])
    
    
    const onSignCertificate = useCallback(async () => {
      if (account) {
        setSignCertificateLoading(true)
        sendMessage({command: "signCertificate", account}, (response: any) => {
          setHasVault(response.vaultAlreadyCreated)
          setCertificateData(response.certificate)
          setSignCertificateLoading(false)  
        })
        
      }
    }, [account])

    const onCreateVault = useCallback(async () => {
      if (account) {
        setVaultLoading(true)
        sendMessage({command: "createVault", account}, (response: any) => {
          setHasVault(response)
          setVaultLoading(false)
        })
      }
    }, [account])


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

export default Tutorial
