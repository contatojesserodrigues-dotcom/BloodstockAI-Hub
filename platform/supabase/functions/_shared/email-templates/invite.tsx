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
} from './theme.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const logoUrl = 'https://uzkicvizgezitiyhihcq.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const InviteEmail = ({
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>{emailFontLink}</Head>
    <Preview>You've been invited to join BloodstockAI</Preview>
    <Body style={emailMain}>
      <Container style={emailContainer}>
        <div style={emailHeader}>
          <Img src={logoUrl} alt="BloodstockAI" width="160" height="auto" style={emailLogo} />
        </div>
        <div style={emailCard}>
          <Heading style={emailH1}>You've Been Invited</Heading>
          <Text style={emailText}>
            You've been invited to join{' '}
            <Link href={siteUrl} style={emailLink}>
              <strong>BloodstockAI</strong>
            </Link>
            — your AI-powered platform for pedigree, performance &amp; mating analysis. Click below to accept.
          </Text>
          <Button style={emailButton} href={confirmationUrl}>
            Accept Invitation
          </Button>
          <Text style={emailFooter}>
            If you weren't expecting this invitation, you can safely ignore this email.
          </Text>
        </div>
        <div style={emailBottomBar}>
          <Text style={emailBottomText}>© 2026 BloodstockAI. All rights reserved.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
