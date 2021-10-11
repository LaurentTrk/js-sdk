import {Block} from 'baseui/block'
import {LabelXSmall} from 'baseui/typography'
import {StyledSpinnerNext} from 'baseui/spinner'


const WaitingNotice = (): JSX.Element => {

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

export default WaitingNotice
