import {Block} from 'baseui/block'
import {
  Card,
  StyledBody
} from "baseui/card";

const Disclaimer = (): JSX.Element => {
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

export default Disclaimer
