const { randomUUID } = require('node:crypto')

const BASE_URL = process.env.APISETU_BASE_URL ?? 'https://sandbox.api-setu.in'
const API_KEY = process.env.APISETU_APIKEY ?? 'demokey123456ABCD789'
const CLIENT_ID = process.env.APISETU_CLIENTID ?? 'in.gov.sandbox'

const path = process.argv[2] ?? '/certificate/v3/bajajallianz/cyipc'
const policyNumber = process.argv[3] ?? 'OG-XX-XXXX-XXXX-XXXXXXXX'
const fieldName = process.argv[4] ?? 'policy_number'

const now = new Date().toISOString()
const body = {
  txnId: randomUUID(),
  format: 'xml',
    certificateParameters: { [fieldName]: policyNumber },
  consentArtifact: {
    consent: {
      consentId: randomUUID(),
      timestamp: now,
      dataConsumer: { id: 'string' },
      dataProvider: { id: 'string' },
      purpose: { description: 'string' },
      user: { idType: 'string', idNumber: 'string', mobile: '9988776655', email: 'test@email.com' },
      data: { id: 'string' },
      permission: {
        access: 'string',
        dateRange: { from: now, to: now },
        frequency: { unit: 'string', value: 0, repeats: 0 },
      },
    },
    signature: { signature: 'string' },
  },
}

async function main() {
  const url = `${BASE_URL}${path}`
  console.log('Calling:', url)
  console.log('Policy number:', policyNumber)
  console.log('---')

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-APISETU-APIKEY': API_KEY,
        'X-APISETU-CLIENTID': CLIENT_ID,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    })

    const text = await response.text()
    console.log('Status:', response.status, response.statusText)
    console.log('Content-Type:', response.headers.get('content-type'))
    console.log('--- Response body ---')
    console.log(text.length > 4000 ? `${text.slice(0, 4000)}\n...(cut, ${text.length} characters total)` : text || '(empty)')
    console.log('---')

    if (response.ok) console.log('RESULT: the endpoint works.')
    else console.log('RESULT: the endpoint answered with an error. Copy everything above and send it to me.')
  } catch (error) {
    console.log('RESULT: could not reach the endpoint.')
    console.log('Reason:', error.message)
    console.log('Check your internet connection, or a company firewall or VPN.')
  }
}

main()