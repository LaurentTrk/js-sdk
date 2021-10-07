import type {FC} from 'react'
import useIsClient from 'hooks/useIsClient'
import {ToasterContainer} from 'baseui/toast'
import {Block} from 'baseui/block'
import {
  HeaderNavigation,
  ALIGN,
  StyledNavigationList,
  StyledNavigationItem
} from "baseui/header-navigation";
import {
  AspectRatioBox,
  AspectRatioBoxBody,
} from 'baseui/aspect-ratio-box';
import { StyledLink } from "baseui/link";

const Layout: FC<{title?: string}> = ({title, children}) => {
  const displayTitle = title || 'Phala SDK Example'
  return (
    <Block maxWidth="1200px" width="100%" margin="0 auto" padding="0 10px">
      <HeaderNavigation>
        <StyledNavigationList $align={ALIGN.left}>
          <StyledNavigationItem>
            <StyledLink href="https://phala.network/en/" 
                        onClick={ (event)=>{ event.stopPropagation();event.preventDefault();window.open("https://phala.network/en/", '_blank')}}>
            <AspectRatioBox width="scale1400">
              <AspectRatioBoxBody as="img" src="./phala-128.png"/>
            </AspectRatioBox>
            </StyledLink>
          </StyledNavigationItem>
          <StyledNavigationItem>{displayTitle}</StyledNavigationItem>
        </StyledNavigationList>
        <StyledNavigationList $align={ALIGN.center}/>
        <StyledNavigationList $align={ALIGN.right}>
          <LinkButton linkUrl="https://github.com/LaurentTrk/phapass" imageUrl="./github.png"/>
          <LinkButton linkUrl="https://www.encode.club/polkadot-club-hackathon" imageUrl="./encode.png"/>
          <LinkButton linkUrl="https://polkadot.network/" imageUrl="./polkadot.png"/>
          <LinkButton linkUrl="https://www.linkedin.com/in/laurenttrk/" imageUrl="./linkedin.png"/>
        </StyledNavigationList>
      
      </HeaderNavigation>

      <Block width="100%" maxWidth="1000px" margin="0 auto" padding="0 10px">
        <Block
          as="header"
          height="60px"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
        </Block>

        <main>{children}</main>

        <ToasterContainer
          placement="top"
          autoHideDuration={3000}
          overrides={{ToastBody: {style: {wordBreak: 'break-all'}}}}
        />
      </Block>
    </Block>
  )
}

const LinkButton: FC<{linkUrl: string, imageUrl: string}> = ({linkUrl, imageUrl}) => {
  return (
    <StyledNavigationItem>
      <StyledLink href={linkUrl} onClick={ (event)=>{ event.stopPropagation();event.preventDefault();window.open(linkUrl, '_blank')}}>
        <img style={{maxWidth:'32px'}} src={imageUrl}></img>
      </StyledLink>
    </StyledNavigationItem>
  )
}

export default Layout
