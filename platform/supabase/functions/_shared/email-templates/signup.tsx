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
  emailButtonOutline,
  emailCard,
  emailDivider,
  emailFeatureItem,
  emailFontLink,
  emailFooter,
  emailH1,
  emailH2,
  emailHeader,
  emailHighlightBox,
  emailLink,
  emailLogo,
  emailMain,
  emailContainer,
  emailText,
  emailMuted,
} from './theme.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const logoUrl = 'https://uzkicvizgezitiyhihcq.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>{emailFontLink}</Head>
    <Preview>Welcome to BloodstockAI — Start Your Trial</Preview>
    <Body style={emailMain}>
      <Container style={emailContainer}>
        <div style={emailHeader}>
          <Img src={logoUrl} alt="BloodstockAI" width="160" height="auto" style={emailLogo} />
        </div>
        <div style={emailCard}>
          <Heading style={emailH1}>Welcome to BloodstockAI</Heading>
          <Text style={emailText}>
            Thank you for joining{' '}
            <Link href={siteUrl} style={emailLink}>
              <strong>BloodstockAI</strong>
            </Link>
            — your AI-powered platform for pedigree, performance &amp; mating analysis.
          </Text>
          <Text style={emailText}>
            Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={emailLink}>
              {recipient}
            </Link>
            ) by clicking the button below:
          </Text>
          <Button style={emailButton} href={confirmationUrl}>
            Verify Email
          </Button>

          <div style={emailDivider} />

          <Heading as="h2" style={emailH2}>Your Trial Includes</Heading>
          <Text style={emailFeatureItem}>✓ 5 complete AI analyses — full access</Text>
          <Text style={emailFeatureItem}>✓ Horse Search &amp; Performance</Text>
          <Text style={emailFeatureItem}>✓ Mating Analysis &amp; Broodmare Plans</Text>
          <Text style={emailFeatureItem}>✓ Stallion Finder &amp; Market Insights</Text>
          <Text style={emailFeatureItem}>✓ Training Analysis — video biomechanics &amp; charts</Text>
          <Text style={emailFeatureItem}>✓ PDF download on all reports</Text>
          <Text style={emailFeatureItem}>✓ No credit card required</Text>

          <div style={emailDivider} />

          <Button style={{ ...emailButton, display: 'block', textAlign: 'center', margin: '0 auto 20px' }} href={`${siteUrl}/dashboard`}>
            Start Your Trial
          </Button>

          <div style={emailHighlightBox}>
            <Text style={emailMuted}>
              Ready for more? Upgrade to <strong>Starter from $99/month</strong> for unlimited analyses and all features.
            </Text>
            <Link href={`${siteUrl}/pricing`} style={emailLink}>
              View Plans →
            </Link>
          </div>

          <Text style={emailFooter}>
            If you didn't create an account, you can safely ignore this email.
          </Text>
        </div>
        <div style={emailBottomBar}>
          <Img src={logoUrl} alt="BloodstockAI" width="80" height="auto" style={{ margin: '0 auto 8px', display: 'block' }} />
          <Text style={emailBottomText}>&copy; 2026 BloodstockAI. All rights reserved.</Text>
          <Text style={emailBottomText}>
            <Link href={siteUrl} style={{ ...emailLink, color: '#C58A2B' }}>agentbloodstockai.com</Link>
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
