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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const logoUrl = 'https://zqeegxhqtnabzkcmgcfv.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet" />
    </Head>
    <Preview>Your login link for BloodstockAI</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={header}>
          <Img src={logoUrl} alt="BloodstockAI" width="160" height="auto" style={logo} />
        </div>
        <div style={card}>
          <Heading style={h1}>Your Login Link</Heading>
          <Text style={text}>
            Click the button below to log in to BloodstockAI. This link will expire shortly.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Log In
          </Button>
          <Text style={footer}>
            If you didn't request this link, you can safely ignore this email.
          </Text>
        </div>
        <Text style={bottomText}>© 2025 BloodstockAI. All rights reserved.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Cinzel', 'Georgia', serif" }
const container = { padding: '0', maxWidth: '560px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '30px 25px 20px', backgroundColor: '#0B0B0D' }
const logo = { margin: '0 auto' }
const card = { backgroundColor: '#0B0B0D', padding: '30px 35px', borderBottom: '3px solid #D4AF37' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#D4AF37',
  margin: '0 0 20px',
  fontFamily: "'Cinzel', 'Georgia', serif",
}
const text = {
  fontSize: '15px',
  color: '#CFCFCF',
  lineHeight: '1.6',
  margin: '0 0 20px',
  fontFamily: "'Georgia', serif",
}
const button = {
  backgroundColor: '#D4AF37',
  color: '#0B0B0D',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '6px',
  padding: '14px 28px',
  textDecoration: 'none',
  fontFamily: "'Cinzel', 'Georgia', serif",
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}
const footer = { fontSize: '12px', color: '#888888', margin: '25px 0 0', fontFamily: "'Georgia', serif" }
const bottomText = { fontSize: '11px', color: '#666666', textAlign: 'center' as const, padding: '15px 25px', fontFamily: "'Georgia', serif" }
