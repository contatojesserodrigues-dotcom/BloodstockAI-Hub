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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const logoUrl = 'https://zqeegxhqtnabzkcmgcfv.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet" />
    </Head>
    <Preview>Welcome to BloodstockAI — Start Your Trial</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={header}>
          <Img src={logoUrl} alt="BloodstockAI" width="160" height="auto" style={logo} />
        </div>
        <div style={card}>
          <Heading style={h1}>Welcome to BloodstockAI</Heading>
          <Text style={text}>
            Thank you for joining{' '}
            <Link href={siteUrl} style={link}>
              <strong>BloodstockAI</strong>
            </Link>
            — your AI-powered platform for pedigree, performance &amp; mating analysis.
          </Text>
          <Text style={text}>
            Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            ) by clicking the button below:
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verify Email
          </Button>

          <div style={divider} />

          <Heading as="h2" style={h2}>Your Trial Includes:</Heading>
          <Text style={featureItem}>&#10003; 5 complete AI analyses — full access</Text>
          <Text style={featureItem}>&#10003; Horse Search &amp; Performance</Text>
          <Text style={featureItem}>&#10003; Mating Analysis &amp; Broodmare Plans</Text>
          <Text style={featureItem}>&#10003; Stallion Finder &amp; Market Insights</Text>
          <Text style={featureItem}>&#10003; Training Analysis — video biomechanics, GPS & longitudinal charts</Text>
          <Text style={featureItem}>&#10003; PDF download on all reports</Text>
          <Text style={featureItem}>&#10003; No credit card required</Text>

          <div style={divider} />

          <Button style={ctaButton} href={`${siteUrl}/dashboard`}>
            Start Your Trial
          </Button>

          <div style={upgradeBox}>
            <Text style={upgradeText}>
              Ready for more? Upgrade to <strong>Starter from $99/month</strong> for unlimited analyses and all features.
            </Text>
            <Link href={`${siteUrl}/pricing`} style={upgradeLink}>
              View Plans &rarr;
            </Link>
          </div>

          <Text style={footer}>
            If you didn't create an account, you can safely ignore this email.
          </Text>
        </div>
        <div style={bottomBar}>
          <Img src={logoUrl} alt="BloodstockAI" width="80" height="auto" style={{ margin: '0 auto 8px', display: 'block' }} />
          <Text style={bottomText}>&copy; 2025 BloodstockAI. All rights reserved.</Text>
          <Text style={bottomText}>
            <Link href={siteUrl} style={link}>agentbloodstockai.com</Link>
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const h2 = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#D4AF37',
  margin: '0 0 12px',
  fontFamily: "'Cinzel', 'Georgia', serif",
}
const text = {
  fontSize: '15px',
  color: '#CFCFCF',
  lineHeight: '1.6',
  margin: '0 0 20px',
  fontFamily: "'Georgia', serif",
}
const featureItem = {
  fontSize: '14px',
  color: '#CFCFCF',
  lineHeight: '1.4',
  margin: '0 0 8px',
  paddingLeft: '8px',
  fontFamily: "'Georgia', serif",
}
const link = { color: '#D4AF37', textDecoration: 'underline' }
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
const ctaButton = {
  ...button,
  backgroundColor: '#D4AF37',
  display: 'block' as const,
  textAlign: 'center' as const,
  margin: '0 auto 20px',
}
const divider = {
  borderTop: '1px solid rgba(212,175,55,0.2)',
  margin: '24px 0',
}
const upgradeBox = {
  backgroundColor: 'rgba(212,175,55,0.08)',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
  border: '1px solid rgba(212,175,55,0.15)',
}
const upgradeText = {
  fontSize: '13px',
  color: '#CFCFCF',
  lineHeight: '1.5',
  margin: '0 0 8px',
  fontFamily: "'Georgia', serif",
}
const upgradeLink = {
  fontSize: '13px',
  color: '#D4AF37',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  fontFamily: "'Cinzel', 'Georgia', serif",
}
const footer = { fontSize: '12px', color: '#888888', margin: '25px 0 0', fontFamily: "'Georgia', serif" }
const bottomBar = { textAlign: 'center' as const, padding: '20px 25px', backgroundColor: '#0B0B0D' }
const bottomText = { fontSize: '11px', color: '#666666', textAlign: 'center' as const, margin: '0 0 4px', fontFamily: "'Georgia', serif" }
