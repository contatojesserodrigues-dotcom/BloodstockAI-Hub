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
} from './theme.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

const logoUrl = 'https://uzkicvizgezitiyhihcq.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const RecoveryEmail = ({
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>{emailFontLink}</Head>
    <Preview>Reset your password for BloodstockAI</Preview>
    <Body style={emailMain}>
      <Container style={emailContainer}>
        <div style={emailHeader}>
          <Img src={logoUrl} alt="BloodstockAI" width="160" height="auto" style={emailLogo} />
        </div>
        <div style={emailCard}>
          <Heading style={emailH1}>Reset Your Password</Heading>
          <Text style={emailText}>
            We received a request to reset your password for BloodstockAI. Click
            the button below to choose a new password.
          </Text>
          <Button style={emailButton} href={confirmationUrl}>
            Reset Password
          </Button>
          <Text style={emailFooter}>
            If you didn't request a password reset, you can safely ignore this
            email. Your password will not be changed.
          </Text>
        </div>
        <div style={emailBottomBar}>
          <Text style={emailBottomText}>© 2026 BloodstockAI. All rights reserved.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
