import type {FC} from 'react'
import Head from 'next/head'
import {H2} from 'baseui/typography'
import useIsClient from 'hooks/useIsClient'
import {ToasterContainer} from 'baseui/toast'
import {Block} from 'baseui/block'
import AccountSelect from './AccountSelect'
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
  const isClient = useIsClient()
  const displayTitle = title || 'Phala SDK Example'
  return (
    <Block width="100%" margin="0 auto" padding="0 10px">
      {/* <Head>
        <title>{displayTitle}</title>
      </Head> */}
      <HeaderNavigation>
        <StyledNavigationList $align={ALIGN.left}>
          <StyledNavigationItem>
            <StyledLink onClick={ ()=>{ window.open("https://phala.network/en/", '_blank')}}>
            <AspectRatioBox width="scale1400">
              <AspectRatioBoxBody
                as="img"
                src="./phala-128.png"
              />
            </AspectRatioBox>
            </StyledLink>
          </StyledNavigationItem>
          <StyledNavigationItem>{displayTitle}</StyledNavigationItem>
        </StyledNavigationList>
        <StyledNavigationList $align={ALIGN.center}/>
        <StyledNavigationList $align={ALIGN.right}>
          <StyledNavigationItem>
            <StyledLink onClick={ ()=>{ window.open("https://github.com/LaurentTrk/phapass", '_blank')}}>
              <AspectRatioBox width="scale800">
                <AspectRatioBoxBody
                as="img"
                src="https://cdn-icons-png.flaticon.com/512/25/25231.png"
                />
              </AspectRatioBox>
            </StyledLink>
          </StyledNavigationItem>
          <StyledNavigationItem>
            <StyledLink onClick={ ()=>{ window.open("https://polkadot.network/", '_blank')}}>
              <AspectRatioBox width="scale800">
                <AspectRatioBoxBody
                as="img"
                src="https://static-00.iconduck.com/assets.00/polkadot-cryptocurrency-icon-512x512-ik5ji7r8.png"
                />
              </AspectRatioBox>
            </StyledLink>
          </StyledNavigationItem>
          <StyledNavigationItem>
            <StyledLink onClick={ ()=>{ window.open("https://www.linkedin.com/in/laurenttrk/", '_blank')}}>
              <AspectRatioBox width="scale1000">
                <AspectRatioBoxBody
                as="img"
                src="https://www.nadacevinci.cz/wp-content/uploads/2020/04/linkedin-icon-for-email-23.png"
                />
              </AspectRatioBox>
            </StyledLink>
          </StyledNavigationItem>


                      
        </StyledNavigationList>
      
      </HeaderNavigation>

      <Block width="100%" maxWidth="700px" margin="0 auto" padding="0 10px">
        <Block
          as="header"
          height="120px"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          {/* <H2>{displayTitle}</H2> */}
          {false && isClient && <AccountSelect></AccountSelect>}
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

export default Layout
