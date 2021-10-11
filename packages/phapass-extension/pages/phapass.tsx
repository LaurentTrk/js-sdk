import { useCallback, useEffect, useState } from 'react'
import { useAtom} from 'jotai'
import accountAtom from 'atoms/account'
import { sendMessage } from 'lib/chrome'
import WaitingNotice from 'components/WaitingNotice'
import Tutorial from 'components/Tutorial'
import Vault from 'components/Vault'

const PhaPass = () => {
  const [account] = useAtom(accountAtom)
  const [tutorialFinished, setTutorialFinished] = useState(false)
  const [statusUpdated, setStatusUpdated] = useState(false)

  useEffect(() => {
    sendMessage({command: "status"}, (response: any) => {
      if (response.hasVault === true){
        setTutorialFinished(true)
      }
      setStatusUpdated(true)
    })
  }, [])

  const letsGo = useCallback(async () => {
    setTutorialFinished(true)
  }, [account])

  if (tutorialFinished){
    return <Vault/>
  }
  if (statusUpdated){
    return <Tutorial letsGo={letsGo}/>
  }
  return <WaitingNotice/>
}

PhaPass.title = 'PhaPass, a password manager using the Phala Blockchain'

export default PhaPass
