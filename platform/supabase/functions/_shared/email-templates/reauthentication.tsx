/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
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
  emailCard,
  emailFontLink,
  emailFooter,
  emailH1,
  emailHeader,
  emailLogo,
  emailMain,
  emailContainer,
  emailText,
  EMAIL_COLORS,
  EMAIL_FONT,
} from './theme.ts'

interface ReauthenticationEmailProps {
  token: string
}

const logoUrl = 'https://uzkicvizgezitiyhihcq.supabase.co/storage/v1/object/public/email-assets/logo.png'

const codeStyle = {
  fontFamily: EMAIL_FONT,
  fontSize: '28px',
  fontWeight: '700' as const,
  color: EMAIL_COLORS.navy,
  margin: '0 0 24px',
  letterSpacing: '4px',
  textAlign: 'center' as const,
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>{emailFontLink}</Head>
    <Preview>Your verification code for BloodstockAI</Preview>
    <Body style={emailMain}>
      <Container style={emailContainer}>
        <div style={emailHeader}>
          <Img src={logoUrl} alt="BloodstockAI" width="160" height="auto" style={emailLogo} />
        </div>
        <div style={emailCard}>
          <Heading style={emailH1}>Confirm Your Identity</Heading>
          <Text style={emailText}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={emailFooter}>
            This code will expire shortly. If you didn't request this, you can
            safely ignore this email.
          </Text>
        </div>
        <div style={emailBottomBar}>
          <Text style={emailBottomText}>© 2026 BloodstockAI. All rights reserved.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
