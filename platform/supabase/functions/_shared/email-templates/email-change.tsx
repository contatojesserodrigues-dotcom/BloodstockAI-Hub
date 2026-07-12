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
  Link,
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
  emailLink,
  emailLogo,
  emailMain,
  emailContainer,
  emailText,
  LOGO_URL,
} from './theme.ts'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const logoUrl = LOGO_URL

export const EmailChangeEmail = ({
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>{emailFontLink}</Head>
    <Preview>Confirm your email change for BloodstockAI</Preview>
    <Body style={emailMain}>
      <Container style={emailContainer}>
        <div style={emailHeader}>
          <Img src={logoUrl} alt="BloodstockAI" width="200" style={emailLogo} />
        </div>
        <div style={emailCard}>
          <Heading style={emailH1}>Confirm Email Change</Heading>
          <Text style={emailText}>
            You requested to change your email address for BloodstockAI from{' '}
            <Link href={`mailto:${email}`} style={emailLink}>
              {email}
            </Link>{' '}
            to{' '}
            <Link href={`mailto:${newEmail}`} style={emailLink}>
              {newEmail}
            </Link>
            .
          </Text>
          <Text style={emailText}>
            Click the button below to confirm this change:
          </Text>
          <Button style={emailButton} href={confirmationUrl}>
            Confirm Email Change
          </Button>
          <Text style={emailFooter}>
            If you didn't request this change, please secure your account immediately.
          </Text>
        </div>
        <div style={emailBottomBar}>
          <Text style={emailBottomText}>© 2026 BloodstockAI. All rights reserved.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
