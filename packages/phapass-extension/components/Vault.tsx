import { useState, FC, useEffect } from 'react'
import { StyledBody} from "baseui/card";
import { Button } from 'baseui/button'
import Disclaimer from 'components/Disclaimer'
import { installMessageListener, sendMessage } from 'lib/chrome';
import {Block} from 'baseui/block'
import {H4} from 'baseui/typography'
import {
  TableBuilder,
  TableBuilderColumn,
} from 'baseui/table-semantic';
import {ButtonGroup, SIZE} from 'baseui/button-group'
import {StyledLink as Link} from 'baseui/link';
import {StatefulPopover} from 'baseui/popover';
import {
  SnackbarProvider,
  useSnackbar,
  DURATION,
} from 'baseui/snackbar';
import {toaster} from 'baseui/toast'

const Vault: FC = () => {

  const [credentials, setCredentials] = useState<any>()

  useEffect(() => {
    sendMessage({command: "list"}, (response: any) => {
      setCredentials(response)
    })
    installMessageListener(onMessageFromBackgroundPage);
  }, [])
  
  const onMessageFromBackgroundPage =  (request: any, sender: any, sendResponse: any) => {
    console.log("onMessageFromBackgroundPage");
    if (request.command === 'updateCredentials'){
      sendMessage({command: "list"}, (response: any) => {
        setCredentials(response)
      })
    }
    return true
  }

  const copyPasswordToClipboard = (url: string) => {
    sendMessage({command: "get", url}, (credential: any) => {
      navigator.clipboard.writeText(credential.password);
    })
  }

  const revealPassword = (url: string) => {
    sendMessage({command: "get", url}, (credential: any) => {
      toaster.positive("Your password is : " + credential.password, {});
    })
  }

  const forgetPassword = (url: string) => {
    sendMessage({command: "remove", url}, () => {
      console.log('Got remove credential answer')
      sendMessage({command: "list"}, (response: any) => {
        setCredentials(response)
      })
    })
  }


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
        <Button onClick={ () => { window.open("https://the-internet.herokuapp.com/login", '_blank')}}>Let's visit our testing login page !</Button>
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

export default Vault
