/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import {
  emailBottomBar,
  emailBottomText,
  emailButton,
  emailCard,
  emailFontLink,
  emailFooter,
  emailH1,
  emailHeader,
  emailLogo,
  emailMain,
  emailContainer,
  emailText,
  LOGO_URL,
} from './theme.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const logoUrl = LOGO_URL

export const MagicLinkEmail = ({
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>{emailFontLink}</Head>
    <Preview>Your login link for BloodstockAI</Preview>
    <Body style={emailMain}>
      <Container style={emailContainer}>
        <div style={emailHeader}>
          <Img src={logoUrl} alt="BloodstockAI" width="200" style={emailLogo} />
        </div>
        <div style={emailCard}>
          <Heading style={emailH1}>Your Login Link</Heading>
          <Text style={emailText}>
            Click the button below to log in to BloodstockAI. This link will expire shortly.
          </Text>
          <Button style={emailButton} href={confirmationUrl}>
            Log In
          </Button>
          <Text style={emailFooter}>
            If you didn't request this link, you can safely ignore this email.
          </Text>
        </div>
        <div style={emailBottomBar}>
          <Text style={emailBottomText}>© 2026 BloodstockAI. All rights reserved.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
